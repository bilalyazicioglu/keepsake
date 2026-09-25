package config

import (
	"strings"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
	if cfg.TokenTTL != 72*time.Hour {
		t.Errorf("TokenTTL = %v, want 72h", cfg.TokenTTL)
	}
	if cfg.JWTSecretGenerated {
		t.Error("JWTSecretGenerated = true with JWT_SECRET set")
	}
}

func TestLoadGeneratesSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !cfg.JWTSecretGenerated || len(cfg.JWTSecret) != 64 {
		t.Errorf("generated secret = %q (generated=%v), want 64 hex chars", cfg.JWTSecret, cfg.JWTSecretGenerated)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		key, value string
	}{
		{"PORT", "80a"},
		{"PORT", "70000"},
		{"MAX_WORKERS", "two"},
		{"MAX_WORKERS", "0"},
		{"JOB_QUEUE_SIZE", "-1"},
		{"MAX_UPLOAD_BYTES", "10G"},
		{"HLS_SEGMENT_SECONDS", "0"},
		{"TOKEN_TTL", "7d"},
		{"TOKEN_TTL", "0s"},
		{"PROCESS_TIMEOUT", "45"},
		{"PROCESS_TIMEOUT", "-1m"},
		{"UPLOAD_TTL", "0"},
		{"HWACCEL", "cuda"},
	}
	for _, tt := range tests {
		t.Run(tt.key+"="+tt.value, func(t *testing.T) {
			t.Setenv("JWT_SECRET", "test-secret")
			t.Setenv(tt.key, tt.value)

			_, err := Load()
			if err == nil {
				t.Fatalf("Load accepted %s=%q", tt.key, tt.value)
			}
			if !strings.Contains(err.Error(), tt.key) {
				t.Errorf("error %q does not name %s", err, tt.key)
			}
		})
	}
}

func TestLoadReportsEveryInvalidValue(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("PORT", "x")
	t.Setenv("TOKEN_TTL", "y")

	_, err := Load()
	if err == nil {
		t.Fatal("Load succeeded with two invalid values")
	}
	for _, key := range []string{"PORT", "TOKEN_TTL"} {
		if !strings.Contains(err.Error(), key) {
			t.Errorf("error %q does not name %s", err, key)
		}
	}
}
