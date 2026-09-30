package http

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"

	"github.com/bilalyazicioglu/keepsake/internal/domain"
	"github.com/bilalyazicioglu/keepsake/internal/usecase"
)

type contextKey string

const (
	ctxKeyUserID contextKey = "auth.user_id"
	ctxKeyRole   contextKey = "auth.role"
)

// Auth validates the JWT and injects the caller's identity into the request
// context. Credentials are accepted from the Authorization header or, for
// media elements that cannot set headers (<video>, <img>, HLS segment
// requests), from a "token" query parameter.
func Auth(auth *usecase.AuthUsecase) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := ""
			if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
				token = strings.TrimPrefix(h, "Bearer ")
			}
			if token == "" {
				token = r.URL.Query().Get("token")
			}
			if token == "" {
				writeError(w, r, fmt.Errorf("%w: missing credentials", domain.ErrUnauthorized))
				return
			}

			claims, err := auth.ValidateToken(token)
			if err != nil {
				writeError(w, r, err)
				return
			}

			ctx := context.WithValue(r.Context(), ctxKeyUserID, claims.UserID)
			ctx = context.WithValue(ctx, ctxKeyRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// callerFromContext returns the authenticated identity set by Auth.
func callerFromContext(ctx context.Context) (uuid.UUID, domain.Role, bool) {
	id, ok := ctx.Value(ctxKeyUserID).(uuid.UUID)
	if !ok {
		return uuid.Nil, "", false
	}
	role, ok := ctx.Value(ctxKeyRole).(domain.Role)
	if !ok {
		return uuid.Nil, "", false
	}
	return id, role, true
}

// RequestLogger emits one structured log line per request.
func RequestLogger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
			start := time.Now()
			next.ServeHTTP(ww, r)
			log.Info("http",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"duration", time.Since(start).String(),
				"remote", r.RemoteAddr,
			)
		})
	}
}

// CORS permits cross-origin browser access only for explicitly configured origins.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			// Even denied and same-origin responses vary, so caches cannot reuse
			// a response carrying another origin's CORS policy.
			h.Add("Vary", "Origin")
			origin := r.Header.Get("Origin")
			if _, ok := allowed[origin]; origin != "" && ok {
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				h.Set("Access-Control-Max-Age", "600")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
