package usecase

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/bilalyazicioglu/keepsake/internal/domain"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type fakeUserRepo struct{ users map[string]*domain.User }

func (r *fakeUserRepo) Create(_ context.Context, u *domain.User) error {
	if r.users == nil {
		r.users = make(map[string]*domain.User)
	}
	if _, exists := r.users[u.Username]; exists {
		return domain.ErrAlreadyExists
	}
	r.users[u.Username] = u
	return nil
}
func (r *fakeUserRepo) FindByUsername(_ context.Context, name string) (*domain.User, error) {
	if u, ok := r.users[name]; ok {
		return u, nil
	}
	return nil, domain.ErrNotFound
}
func (r *fakeUserRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	for _, u := range r.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, domain.ErrNotFound
}

func TestRegisterBounds(t *testing.T) {
	tests := []struct {
		name, username, password string
		valid                    bool
	}{
		{"short username", " ab ", "password", false},
		{"minimum username trimmed", " abc ", "password", true},
		{"maximum username trimmed", " " + strings.Repeat("a", 64) + " ", "password", true},
		{"long username", strings.Repeat("a", 65), "password", false},
		{"short password", "alice", "1234567", false},
		{"minimum password", "alice", "12345678", true},
		{"maximum password", "alice", strings.Repeat("a", 72), true},
		{"long password", "alice", strings.Repeat("a", 73), false},
		{"multibyte maximum password", "alice", strings.Repeat("é", 36), true},
		{"multibyte long password", "alice", strings.Repeat("é", 37), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeUserRepo{}
			auth := NewAuthUsecase(repo, "secret", time.Hour)
			u, err := auth.Register(context.Background(), tt.username, tt.password)
			if !tt.valid {
				if !errors.Is(err, domain.ErrInvalidInput) || u != nil || len(repo.users) != 0 {
					t.Fatalf("invalid registration: user=%v err=%v", u, err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if u.Username != strings.TrimSpace(tt.username) || u.ID == uuid.Nil || u.Role != domain.RoleUser {
				t.Fatalf("unexpected user: %+v", u)
			}
			if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(tt.password)); err != nil {
				t.Fatalf("password hash: %v", err)
			}
		})
	}
}

func TestRegisterDuplicate(t *testing.T) {
	auth := NewAuthUsecase(&fakeUserRepo{}, "secret", time.Hour)
	if _, err := auth.Register(context.Background(), "alice", "password"); err != nil {
		t.Fatal(err)
	}
	if _, err := auth.Register(context.Background(), " alice ", "password"); !errors.Is(err, domain.ErrAlreadyExists) {
		t.Fatalf("duplicate: %v", err)
	}
}

func TestLoginAndValidateToken(t *testing.T) {
	auth := NewAuthUsecase(&fakeUserRepo{}, "secret", time.Hour)
	u, err := auth.Register(context.Background(), "alice", "password")
	if err != nil {
		t.Fatal(err)
	}
	token, loggedIn, err := auth.Login(context.Background(), " alice ", "password")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := auth.ValidateToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if loggedIn.ID != u.ID || claims.UserID != u.ID || claims.Subject != u.ID.String() || claims.Role != u.Role || claims.Issuer != "keepsake" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
	if claims.ExpiresAt == nil || claims.IssuedAt == nil || claims.ExpiresAt.Sub(claims.IssuedAt.Time) != time.Hour {
		t.Fatalf("unexpected token lifetime: %+v", claims)
	}
	var message string
	for _, credentials := range [][2]string{{"missing", "password"}, {"alice", "wrong-password"}} {
		token, user, err := auth.Login(context.Background(), credentials[0], credentials[1])
		if !errors.Is(err, domain.ErrUnauthorized) || token != "" || user != nil {
			t.Fatalf("failed login: token=%q user=%v err=%v", token, user, err)
		}
		if message == "" {
			message = err.Error()
		} else if err.Error() != message {
			t.Fatalf("login errors expose account existence: %q vs %q", message, err.Error())
		}
	}
}

func TestValidateTokenRejectsInvalidCredentials(t *testing.T) {
	auth := NewAuthUsecase(&fakeUserRepo{}, "secret", time.Hour)
	tests := []struct {
		name    string
		id      uuid.UUID
		expires time.Time
		method  jwt.SigningMethod
		key     any
	}{
		{"expired", uuid.New(), time.Now().Add(-time.Hour), jwt.SigningMethodHS256, []byte("secret")},
		{"other secret", uuid.New(), time.Now().Add(time.Hour), jwt.SigningMethodHS256, []byte("other-secret")},
		{"unsigned", uuid.New(), time.Now().Add(time.Hour), jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType},
		{"nil user ID", uuid.Nil, time.Now().Add(time.Hour), jwt.SigningMethodHS256, []byte("secret")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims := &Claims{UserID: tt.id, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(tt.expires)}}
			token, err := jwt.NewWithClaims(tt.method, claims).SignedString(tt.key)
			if err != nil {
				t.Fatal(err)
			}
			if claims, err := auth.ValidateToken(token); !errors.Is(err, domain.ErrUnauthorized) || claims != nil {
				t.Fatalf("accepted invalid token: claims=%v err=%v", claims, err)
			}
		})
	}
}

func TestValidateTokenAcceptsExistingIssuer(t *testing.T) {
	auth := NewAuthUsecase(&fakeUserRepo{}, "secret", time.Hour)
	claims := &Claims{UserID: uuid.New(), RegisteredClaims: jwt.RegisteredClaims{Issuer: "legacy-issuer", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := auth.ValidateToken(token); err != nil {
		t.Fatalf("legacy session rejected: %v", err)
	}
}
