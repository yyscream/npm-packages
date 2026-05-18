---
name: deployment-automation
description: Agents should invoke this skill for Docker Compose deployments, container updates, stack health checks, rollbacks, compose-file changes, image upgrades, failed deploys, or service restart planning. Provides safe deployment and rollback workflows.
---

# Deployment Automation

Manage Docker Compose deployments, container lifecycle, image updates, and rollbacks.

## Quick Start

### Deploy a Compose Stack

```bash
# Start services
docker compose up -d

# Start with rebuild
docker compose up -d --build

# Check status
docker compose ps
```

### Update a Running Service

```bash
# Pull latest images
docker compose pull

# Recreate with new images
docker compose up -d --remove-orphans

# Verify health
docker compose ps
docker compose logs --tail=20 <service>
```

---

## Docker Compose Management

### Lifecycle Commands

```bash
# Start all services
docker compose up -d

# Stop all services (preserves volumes)
docker compose down

# Stop and remove volumes (DESTRUCTIVE)
docker compose down -v

# Restart a specific service
docker compose restart <service>

# Scale a service
docker compose up -d --scale <service>=3

# View logs
docker compose logs -f <service>
docker compose logs --tail=50 <service>
```

### Stack Health Check

```bash
# List all containers with status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Check resource usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Inspect a specific container
docker inspect <container> | jq '.[0].State'
```

---

## Image Update Workflow

Safe update process with rollback path:

### Step 1: Pre-Update Checks

```bash
# Record current state
docker compose ps > /tmp/pre-update-state.txt
docker compose config --images > /tmp/current-images.txt

# Check current image digests
docker compose images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}"
```

### Step 2: Pull New Images

```bash
# Pull latest images
docker compose pull

# Compare image IDs (see if anything changed)
docker compose images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}"
```

### Step 3: Deploy Update

```bash
# Recreate containers with new images
docker compose up -d --remove-orphans

# Wait for services to stabilize
sleep 10

# Verify all containers are healthy
docker compose ps
```

### Step 4: Post-Update Verification

```bash
# Check for restart loops
docker compose ps --format "{{.Name}}: {{.Status}}" | grep -i "restarting"

# Check logs for errors
docker compose logs --since 2m --tail=50 2>&1 | grep -iE "error|fatal|panic"

# Test service endpoints
curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/health
```

### Step 5: Rollback (If Needed)

```bash
# Rollback to previous image
docker compose down
# Edit compose file or use specific image tags
docker compose up -d

# Or if you tagged the previous image:
docker tag <service>:previous <service>:latest
docker compose up -d
```

---

## Health Check Patterns

### In Compose Files

Always include health checks in new deployments:

```yaml
services:
  myservice:
    image: myimage:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

### Common Health Check Types

```yaml
# HTTP endpoint
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]

# TCP port
healthcheck:
  test: ["CMD", "nc", "-z", "localhost", "5432"]

# Command execution
healthcheck:
  test: ["CMD", "pg_isready", "-U", "postgres"]

# Shell command
healthcheck:
  test: ["CMD-SHELL", "wget -q --spider http://localhost:80 || exit 1"]
```

### Monitor Health Status

```bash
# Check health status of all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Inspect health details
docker inspect --format='{{json .State.Health}}' <container> | jq '.'

# Watch for unhealthy containers
docker ps --filter "health=unhealthy"
```

---

## Container Cleanup

### Regular Maintenance

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -f

# Remove unused images (including tagged)
docker image prune -a -f

# Remove unused volumes (CAREFUL — data loss)
docker volume prune -f

# Remove unused networks
docker network prune -f

# Full cleanup (containers, images, networks — NOT volumes)
docker system prune -f

# Full cleanup INCLUDING volumes (DESTRUCTIVE)
docker system prune -a --volumes -f
```

### Disk Usage

```bash
# Docker disk usage summary
docker system df

# Detailed breakdown
docker system df -v
```

---

## Compose File Best Practices

### Template for New Services

```yaml
version: "3.8"

services:
  servicename:
    image: image:tag          # Pin to specific tag, not :latest for production
    container_name: servicename
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    environment:
      - TZ=Etc/UTC
    volumes:
      - servicename_data:/data
    ports:
      - "8080:8080"
    networks:
      - default
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  servicename_data:

networks:
  default:
```

### Key Principles

1. **Pin image tags** — Use `image:1.2.3` not `image:latest` for production
2. **Always health check** — Every service should have a health check
3. **Always restart policy** — `unless-stopped` or `always`
4. **Log rotation** — Set `max-size` and `max-file` to prevent disk fill
5. **Named volumes** — Use named volumes, not bind mounts, for data persistence
6. **Timezone** — Set `TZ=Etc/UTC` for consistent logs
7. **Resource limits** — Set memory/CPU limits for critical services

### Resource Limits

```yaml
services:
  myservice:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
        reservations:
          memory: 256M
          cpus: "0.25"
```

---

## Rollback Strategies

### Strategy 1: Image Tag Pinning

```bash
# Before update: note current tag
docker compose images

# Update compose file to new tag
# If it fails: revert compose file to old tag
docker compose up -d
```

### Strategy 2: Docker Image Tagging

```bash
# Tag current image before updating
docker tag myimage:latest myimage:rollback
docker compose pull
docker compose up -d

# If it fails:
docker tag myimage:rollback myimage:latest
docker compose up -d
```

### Strategy 3: Compose File Versioning

```bash
# Keep previous compose file
cp docker-compose.yml docker-compose.yml.bak

# Deploy new version
docker compose up -d

# If it fails:
cp docker-compose.yml.bak docker-compose.yml
docker compose up -d
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs <service>

# Check if port is already in use
ss -tlnp | grep <port>

# Check if image exists
docker images | grep <image>

# Try running interactively
docker compose run --rm <service> sh
```

### Container Keeps Restarting

```bash
# Check restart count
docker inspect <container> --format='{{.RestartCount}}'

# Check exit code
docker inspect <container> --format='{{.State.ExitCode}}'

# Check OOM kill
docker inspect <container> --format='{{.State.OOMKilled}}'

# View last logs before crash
docker logs --tail=50 <container>
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Identify large images
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | sort -k2 -h

# Clean up
docker system prune -f
docker image prune -a -f
```

---

_Kai skill — Docker deployment and lifecycle management_
