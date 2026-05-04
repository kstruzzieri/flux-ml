package project

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCanonicalProjectPath_Empty(t *testing.T) {
	_, err := CanonicalProjectPath("")
	if err == nil {
		t.Fatal("expected error for empty path, got nil")
	}
}

func TestCanonicalProjectPath_Absolute(t *testing.T) {
	dir := t.TempDir()
	got, err := CanonicalProjectPath(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Result should be absolute
	if !filepath.IsAbs(got) {
		t.Errorf("result %q is not absolute", got)
	}
}

func TestCanonicalProjectPath_Relative(t *testing.T) {
	dir := t.TempDir()
	// Create a subdirectory and use a relative path to it
	sub := filepath.Join(dir, "child")
	os.Mkdir(sub, 0755)

	// Change to parent so "child" is a valid relative path
	orig, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(orig)

	got, err := CanonicalProjectPath("child")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !filepath.IsAbs(got) {
		t.Errorf("result %q is not absolute", got)
	}
}

func TestCanonicalProjectPath_ResolvesSymlinks(t *testing.T) {
	dir := t.TempDir()
	real := filepath.Join(dir, "real")
	link := filepath.Join(dir, "link")
	os.Mkdir(real, 0755)
	os.Symlink(real, link)

	gotReal, err := CanonicalProjectPath(real)
	if err != nil {
		t.Fatalf("canonical real: %v", err)
	}
	gotLink, err := CanonicalProjectPath(link)
	if err != nil {
		t.Fatalf("canonical link: %v", err)
	}
	if gotReal != gotLink {
		t.Errorf("real=%q link=%q — should be identical after canonicalization", gotReal, gotLink)
	}
}

func TestCanonicalProjectPath_NonExistentFallback(t *testing.T) {
	dir := t.TempDir()
	nonExistent := filepath.Join(dir, "does-not-exist")
	resolvedDir, err := filepath.EvalSymlinks(dir)
	if err != nil {
		t.Fatalf("resolving temp dir: %v", err)
	}
	expected := filepath.Join(resolvedDir, "does-not-exist")

	got, err := CanonicalProjectPath(nonExistent)
	if err != nil {
		t.Fatalf("unexpected error for non-existent path: %v", err)
	}
	if !filepath.IsAbs(got) {
		t.Errorf("result %q is not absolute", got)
	}
	if got != expected {
		t.Errorf("got %q, want %q (resolved parent plus missing leaf)", got, expected)
	}
}

func TestCanonicalProjectPath_ResolvesSymlinkParentForNonExistentLeaf(t *testing.T) {
	dir := t.TempDir()
	real := filepath.Join(dir, "real")
	link := filepath.Join(dir, "link")
	if err := os.Mkdir(real, 0755); err != nil {
		t.Fatalf("mkdir real: %v", err)
	}
	if err := os.Symlink(real, link); err != nil {
		t.Fatalf("symlink: %v", err)
	}

	gotReal, err := CanonicalProjectPath(filepath.Join(real, "new-project"))
	if err != nil {
		t.Fatalf("canonical real child: %v", err)
	}
	gotLink, err := CanonicalProjectPath(filepath.Join(link, "new-project"))
	if err != nil {
		t.Fatalf("canonical link child: %v", err)
	}
	if gotReal != gotLink {
		t.Errorf("real child=%q link child=%q — should be identical after canonicalization", gotReal, gotLink)
	}
}

func TestCanonicalProjectPath_NormalizesTrailingSlash(t *testing.T) {
	dir := t.TempDir()
	withSlash := dir + "/"
	got, err := CanonicalProjectPath(withSlash)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	gotClean, err := CanonicalProjectPath(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != gotClean {
		t.Errorf("trailing slash not normalized: %q != %q", got, gotClean)
	}
}
