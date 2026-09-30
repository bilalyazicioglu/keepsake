package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORS(t *testing.T) {
	for _, tt := range []struct {
		name      string
		allowed   []string
		origin    string
		permitted bool
	}{
		{"default deny", nil, "https://client.example", false},
		{"allowed", []string{"https://client.example", "http://localhost:5173"}, "https://client.example", true},
		{"second allowed", []string{"https://client.example", "http://localhost:5173"}, "http://localhost:5173", true},
		{"unlisted", []string{"https://client.example"}, "https://other.example", false},
		{"prefix mismatch", []string{"https://client.example"}, "https://client.example.evil", false},
		{"port mismatch", []string{"https://client.example"}, "https://client.example:8443", false},
		{"no origin", []string{"https://client.example"}, "", false},
		{"wildcard is not permissive", []string{"*"}, "https://client.example", false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			for _, method := range []string{http.MethodGet, http.MethodOptions} {
				called := false
				handler := CORS(tt.allowed)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					called = true
					w.Header().Add("Vary", "Accept-Encoding")
					w.WriteHeader(http.StatusOK)
				}))
				req := httptest.NewRequest(method, "/", nil)
				if tt.origin != "" {
					req.Header.Set("Origin", tt.origin)
				}
				res := httptest.NewRecorder()
				handler.ServeHTTP(res, req)
				wantOrigin := ""
				if tt.permitted {
					wantOrigin = tt.origin
				}
				if got := res.Header().Get("Access-Control-Allow-Origin"); got != wantOrigin {
					t.Errorf("%s origin=%q want=%q", method, got, wantOrigin)
				}
				for _, header := range []string{"Access-Control-Allow-Methods", "Access-Control-Allow-Headers", "Access-Control-Max-Age"} {
					if present := res.Header().Get(header) != ""; present != tt.permitted {
						t.Errorf("%s %s presence=%v", method, header, present)
					}
				}
				if !strings.Contains(strings.Join(res.Header().Values("Vary"), ","), "Origin") {
					t.Error("missing Vary: Origin")
				}
				if method == http.MethodOptions {
					if called || res.Code != http.StatusNoContent {
						t.Errorf("preflight called=%v status=%d", called, res.Code)
					}
				} else if !called || res.Code != http.StatusOK {
					t.Errorf("request called=%v status=%d", called, res.Code)
				}
			}
		})
	}
}
