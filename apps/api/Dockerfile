# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api
RUN npm ci
RUN npm run db:generate --workspace=@studysync/database
RUN npm run build --workspace=api

# Stage 2: Production Run
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "apps/api/dist/main.js"]
