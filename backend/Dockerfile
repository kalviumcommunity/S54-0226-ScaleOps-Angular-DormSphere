# --- Build Stage ---
FROM rust:1.88-slim AS builder

WORKDIR /app

# Build application
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

# --- Final Stage ---
FROM debian:bookworm-slim
COPY --from=builder /app/target/release/backend /usr/local/bin/backend
CMD ["backend"]