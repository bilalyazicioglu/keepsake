package config

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"time"
)

// Config holds every runtime setting, populated from environment variables.
type Config struct {
	Port   int
	WebDir string

	DatabaseURL string

	StoragePath string

	JWTSecret          string
	JWTSecretGenerated bool // true when JWT_SECRET was empty and we minted one
	TokenTTL           time.Duration

	MaxWorkers        int
	JobQueueSize      int
	ProcessTimeout    time.Duration
	MaxUploadBytes    int64
	HLSSegmentSeconds int
	// HWAccel selects the H.264 encoder: "auto" (VideoToolbox on macOS,
	// libx264 elsewhere), "videotoolbox", or "none".
	HWAccel string
	// UploadTTL is how long an unfinished chunked upload survives before the
	// janitor reclaims its staging file.
	UploadTTL time.Duration

	FFmpegPath  string
	FFprobePath string
}

// Load reads configuration from the environment, applying safe defaults for a
// low-spec home server. It fails fast on values that cannot possibly work and
// reports every invalid variable at once rather than only the first.
func Load() (*Config, error) {
	var env envReader
	cfg := &Config{
		Port:              env.int("PORT", 8080),
		WebDir:            env.str("WEB_DIR", "./static"),
		DatabaseURL:       env.str("DATABASE_URL", "postgres://mediauser:mediapass@localhost:5432/mediacloud?sslmode=disable"),
		StoragePath:       env.str("STORAGE_PATH", "./data/media"),
		JWTSecret:         env.str("JWT_SECRET", ""),
		TokenTTL:          env.duration("TOKEN_TTL", 72*time.Hour),
		MaxWorkers:        env.int("MAX_WORKERS", defaultWorkers()),
		JobQueueSize:      env.int("JOB_QUEUE_SIZE", 128),
		ProcessTimeout:    env.duration("PROCESS_TIMEOUT", 45*time.Minute),
		MaxUploadBytes:    env.int64("MAX_UPLOAD_BYTES", 10<<30), // 10 GiB
		HLSSegmentSeconds: env.int("HLS_SEGMENT_SECONDS", 6),
		HWAccel:           env.str("HWACCEL", "auto"),
		UploadTTL:         env.duration("UPLOAD_TTL", 48*time.Hour),
		FFmpegPath:        env.str("FFMPEG_PATH", "ffmpeg"),
		FFprobePath:       env.str("FFPROBE_PATH", "ffprobe"),
	}

	if cfg.Port <= 0 || cfg.Port > 65535 {
		env.fail("PORT %d out of range", cfg.Port)
	}
	if cfg.MaxWorkers < 1 {
		env.fail("MAX_WORKERS must be >= 1, got %d", cfg.MaxWorkers)
	}
	if cfg.JobQueueSize < 1 {
		env.fail("JOB_QUEUE_SIZE must be >= 1, got %d", cfg.JobQueueSize)
	}
	if cfg.MaxUploadBytes < 1 {
		env.fail("MAX_UPLOAD_BYTES must be >= 1, got %d", cfg.MaxUploadBytes)
	}
	if cfg.HLSSegmentSeconds < 1 {
		env.fail("HLS_SEGMENT_SECONDS must be >= 1, got %d", cfg.HLSSegmentSeconds)
	}
	for _, d := range []struct {
		key string
		val time.Duration
	}{
		{"TOKEN_TTL", cfg.TokenTTL},
		{"PROCESS_TIMEOUT", cfg.ProcessTimeout},
		{"UPLOAD_TTL", cfg.UploadTTL},
	} {
		if d.val <= 0 {
			env.fail("%s must be positive, got %s", d.key, d.val)
		}
	}
	switch cfg.HWAccel {
	case "auto", "videotoolbox", "none":
	default:
		env.fail("HWACCEL must be auto, videotoolbox or none, got %q", cfg.HWAccel)
	}
	if err := env.err(); err != nil {
		return nil, err
	}

	if cfg.JWTSecret == "" {
		secret, err := randomSecret()
		if err != nil {
			return nil, fmt.Errorf("config: generate fallback JWT secret: %w", err)
		}
		cfg.JWTSecret = secret
		cfg.JWTSecretGenerated = true
	}
	return cfg, nil
}

// defaultWorkers leaves headroom for the HTTP server and PostgreSQL on
// shared hardware: half the cores, at least one.
func defaultWorkers() int {
	n := runtime.NumCPU() / 2
	if n < 1 {
		n = 1
	}
	return n
}

func randomSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// envReader reads typed environment variables, collecting every parse and
// validation failure so they can be reported together.
type envReader struct {
	errs []error
}

func (e *envReader) fail(format string, args ...any) {
	e.errs = append(e.errs, fmt.Errorf("config: "+format, args...))
}

func (e *envReader) err() error {
	return errors.Join(e.errs...)
}

func (e *envReader) str(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func (e *envReader) int(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		e.fail("%s must be an integer, got %q", key, v)
		return def
	}
	return n
}

func (e *envReader) int64(key string, def int64) int64 {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		e.fail("%s must be an integer number of bytes, got %q", key, v)
		return def
	}
	return n
}

func (e *envReader) duration(key string, def time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		e.fail("%s must be a duration such as 90s, 45m or 72h, got %q", key, v)
		return def
	}
	return d
}
