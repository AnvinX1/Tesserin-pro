#!/bin/bash
cat << 'INNER_EOF' >> src/styles/globals.css

/* Override xterm.css forcing a black background on the viewport */
.xterm .xterm-viewport {
    background-color: transparent !important;
}
INNER_EOF
