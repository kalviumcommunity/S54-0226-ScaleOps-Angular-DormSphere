# --- Build Stage ---
FROM rust:1.88-slim AS builder

WORKDIR /app

# Copy sources and build the actual backend binary.
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

# --- Final Stage ---
FROM debian:bookworm-slim

WORKDIR /app

# Install SSL (IMPORTANT for Postgres)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend

CMD ["backend"]