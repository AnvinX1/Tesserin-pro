cat << 'INNER_EOF' >> src/styles/globals.css

/* Force transparency everywhere inside the xterm container */
.xterm, .xterm-viewport, .xterm-screen, .xterm-text-layer {
    background-color: transparent !important;
}
INNER_EOF
