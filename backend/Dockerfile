# syntax=docker/dockerfile:1.7
# --- Build Stage ---
FROM rust:1.88-slim AS builder

WORKDIR /app

# Copy sources and build the actual backend binary.
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
	--mount=type=cache,target=/app/target-cache \
	CARGO_TARGET_DIR=/app/target-cache cargo build --release && \
	cp /app/target-cache/release/backend /app/backend

# --- Final Stage ---
FROM debian:bookworm-slim

WORKDIR /app

# Install SSL (IMPORTANT for Postgres)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/backend /usr/local/bin/backend

CMD ["backend"]