package worker

import (
	"net"
	"testing"
	"time"
)

// 192.0.2.0/24 is TEST-NET-1 (RFC 5737) — guaranteed non-routable, so a dial to it
// either times out or is rejected, but never connects. Perfect "dead IP" stand-in.
const deadIP1 = "192.0.2.1"
const deadIP2 = "192.0.2.2"

func TestPickReachableIP(t *testing.T) {
	// Spin up a real listener to act as the "alive" IP.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	defer ln.Close()
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			conn.Close()
		}
	}()
	_, alivePort, _ := net.SplitHostPort(ln.Addr().String())
	const aliveIP = "127.0.0.1"

	tests := []struct {
		name    string
		addrs   []string
		port    string
		want    string
		timeout time.Duration
	}{
		{
			name:    "single alive IP is returned",
			addrs:   []string{aliveIP},
			port:    alivePort,
			want:    aliveIP,
			timeout: 2 * time.Second,
		},
		{
			name:    "dead primary fails over to alive sibling (the piketdireksi case)",
			addrs:   []string{deadIP1, aliveIP},
			port:    alivePort,
			want:    aliveIP,
			timeout: 2 * time.Second,
		},
		{
			name:    "alive primary is preferred over dead sibling",
			addrs:   []string{aliveIP, deadIP1},
			port:    alivePort,
			want:    aliveIP,
			timeout: 2 * time.Second,
		},
		{
			name:    "earliest DNS-order alive IP wins when several are alive",
			addrs:   []string{deadIP1, aliveIP, aliveIP},
			port:    alivePort,
			want:    aliveIP,
			timeout: 2 * time.Second,
		},
		{
			name:    "all dead returns empty (keeps caller on addrs[0])",
			addrs:   []string{deadIP1, deadIP2},
			port:    alivePort,
			want:    "",
			timeout: 1 * time.Second,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := pickReachableIP(tt.addrs, tt.port, tt.timeout)
			if got != tt.want {
				t.Errorf("pickReachableIP(%v, %q) = %q, want %q", tt.addrs, tt.port, got, tt.want)
			}
		})
	}
}
