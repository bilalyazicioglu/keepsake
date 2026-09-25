package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/bilalyazicioglu/keepsake/internal/domain"
	"github.com/bilalyazicioglu/keepsake/internal/usecase"
)

// fakeMediaRepo serves a fixed set of items; only FindByID is exercised.
type fakeMediaRepo struct {
	domain.MediaRepository
	items map[uuid.UUID]*domain.MediaItem
}

func (f *fakeMediaRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.MediaItem, error) {
	if item, ok := f.items[id]; ok {
		return item, nil
	}
	return nil, domain.ErrNotFound
}

func TestRawServesUploadsInASandbox(t *testing.T) {
	storage := t.TempDir()
	owner := uuid.New()
	item := &domain.MediaItem{
		ID:       uuid.New(),
		UserID:   owner,
		Type:     domain.MediaTypePhoto,
		Status:   domain.MediaStatusReady,
		MimeType: "image/svg+xml",
		FilePath: "originals/drawing.svg",
	}
	svg := `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`
	if err := os.MkdirAll(filepath.Join(storage, "originals"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(storage, item.FilePath), []byte(svg), 0o644); err != nil {
		t.Fatal(err)
	}

	media := usecase.NewMediaUsecase(usecase.MediaConfig{
		Repo:        &fakeMediaRepo{items: map[uuid.UUID]*domain.MediaItem{item.ID: item}},
		StoragePath: storage,
	})
	h := NewStreamHandler(media)

	r := chi.NewRouter()
	r.Get("/media/raw/{id}", func(w http.ResponseWriter, req *http.Request) {
		ctx := context.WithValue(req.Context(), ctxKeyUserID, owner)
		ctx = context.WithValue(ctx, ctxKeyRole, domain.RoleUser)
		h.Raw(w, req.WithContext(ctx))
	})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/media/raw/"+item.ID.String(), nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Errorf("X-Content-Type-Options = %q, want nosniff", got)
	}
	csp := rec.Header().Get("Content-Security-Policy")
	for _, directive := range []string{"sandbox", "default-src 'none'"} {
		if !strings.Contains(csp, directive) {
			t.Errorf("Content-Security-Policy = %q, missing %q", csp, directive)
		}
	}
}
