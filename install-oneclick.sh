#!/bin/bash
# 🚀 MORIS Autonomous — One-Click Installer
# curl -fsSL https://moris.sh/install | bash

set -e

MORIS_VERSION="2.0.0"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.moris}"
CONFIG_DIR="${CONFIG_DIR:-$HOME/.config/moris}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }

print_banner() {
    cat << 'EOF'

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🚀 MORIS Autonomous — 21-Agent AI Workforce System     ║
║                                                            ║
║        One-click install | Self-hosted | Auto-updated      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

EOF
}

check_prerequisites() {
    info "Checking prerequisites..."
    
    # Docker
    if ! command -v docker &> /dev/null; then
        error "Docker not found. Install from https://docs.docker.com/get-docker/"
        exit 1
    fi
    success "Docker found"
    
    # Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        warn "Docker Compose not found (using 'docker compose')"
    fi
    success "Docker Compose found"
    
    # Git
    if ! command -v git &> /dev/null; then
        warn "Git not found (recommended for updates)"
    fi
}

ask_install_type() {
    echo ""
    echo "Select installation type:"
    echo ""
    echo "  ${GREEN}[1]${NC} ALL-IN-ONE OpenClaw + MORIS (standalone)"
    echo "      → Complete system with Gateway + Plugin"
    echo "      → Auto-updates included"
    echo ""
    echo "  ${BLUE}[2]${NC} PLUGIN ONLY (requires OpenClaw)"
    echo "      → For existing OpenClaw installation"
    echo ""
    
    read -p "Choice [1-2]: " choice
    
    case $choice in
        1) INSTALL_TYPE="standalone" ;;
        2) INSTALL_TYPE="plugin" ;;
        *) error "Invalid choice"; exit 1 ;;
    esac
}

ask_tier() {
    echo ""
    echo "Select plan:"
    echo ""
    echo "  ${GREEN}[1] FREE${NC}     — 2 agents, 3 projects (forever free)"
    echo "  ${BLUE}[2] STARTER${NC}  — 5 agents, 10 projects ($19/mo)"
    echo "  ${MAGENTA}[3] PRO${NC}      — 12 agents, unlimited ($49/mo)"
    echo "  ${YELLOW}[4] ENTERPRISE${NC} — 21 agents, white-label ($149/mo)"
    echo ""
    
    read -p "Plan [1-4]: " tier_choice
    
    case $tier_choice in
        1) TIER="free" ;;
        2) TIER="starter" ;;
        3) TIER="pro" ;;
        4) TIER="enterprise" ;;
        *) TIER="free" ;;
    esac
    
    export MORIS_TIER="$TIER"
    success "Selected: ${TIER^^} tier"
}

install_standalone() {
    info "Installing ALL-IN-ONE OpenClaw + MORIS..."
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Download compose file
    curl -fsSL \
        "https://raw.githubusercontent.com/tomasreminek/moris-autonomous/main/docker-compose.standalone.yml" \
        -o docker-compose.yml
    
    # Download .env template
    curl -fsSL \
        "https://raw.githubusercontent.com/tomasreminek/moris-autonomous/main/.env.example" \
        -o .env
    
    # Configure
    cat > .env << EOF
# MORIS Autonomous Configuration
MORIS_TIER=$TIER
MORIS_HTTP_PORT=3001
MORIS_WS_PORT=3002
OPENCLAW_PORT=3456
AUTO_UPDATE=true
PLUGIN_CHECK_INTERVAL=3600
ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/")
JWT_SECRET=$(openssl rand -hex 32)
EOF
    
    # Start
    docker-compose up -d
    
    success "Installation complete!"
    echo ""
    echo "${GREEN}🚀 MORIS is running!${NC}"
    echo ""
    echo "  Dashboard: http://localhost:3001"
    echo "  Gateway:   http://localhost:3456"
    echo ""
    echo "  Commands:"
    echo "    cd $INSTALL_DIR"
    echo "    docker-compose logs -f"
    echo "    docker-compose stop"
    echo "    docker-compose start"
    echo ""
}

install_plugin() {
    info "Installing PLUGIN ONLY..."
    
    if ! command -v openclaw &> /dev/null; then
        error "OpenClaw not found!"
        echo ""
        echo "Install OpenClaw first:"
        echo "  npm install -g @openclaw/cli"
        echo ""
        echo "Or use option [1] ALL-IN-ONE instead"
        exit 1
    fi
    
    info "Installing MORIS plugin..."
    openclaw plugins install @community/moris-autonomous
    openclaw plugins enable moris-autonomous
    
    # Config
    openclaw config set plugins.entries.moris-autonomous.enabled true
    openclaw config set plugins.entries.moris-autonomous.config.tier "$TIER"
    
    success "Plugin installed!"
    echo ""
    echo "${GREEN}🚀 Run 'openclaw start' to launch${NC}"
    echo ""
    echo "  Commands:"
    echo "    /moris        — Open dashboard"
    echo "    /moris-agents — List agents"
    echo ""
}

show_next_steps() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "${GREEN}Next steps:${NC}"
    echo ""
    
    if [ "$INSTALL_TYPE" = "standalone" ]; then
        echo "  1. Open your browser: http://localhost:3001"
        echo "  2. Login with: admin / [password shown above]"
        echo "  3. Explore /moris-agents command in Telegram"
    else
        echo "  1. Run: openclaw start"
        echo "  2. Use /moris command in your chat"
        echo "  3. Browse available agents"
    fi
    
    echo ""
    echo "📚 Docs: https://docs.openclaw.ai/plugins/moris-autonomous"
    echo "💬 Help: https://discord.gg/clawd"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
}

# Main
main() {
    print_banner
    check_prerequisites
    ask_install_type
    ask_tier
    
    if [ "$INSTALL_TYPE" = "standalone" ]; then
        install_standalone
    else
        install_plugin
    fi
    
    show_next_steps
}

main "$@"
