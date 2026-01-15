
import * as esbuild from 'esbuild';
import path from 'path';

async function build() {
    await esbuild.build({
        entryPoints: ['widget/ChatWidget.tsx'],
        outfile: 'public/namibia-widget.js',
        bundle: true,
        minify: true,
        format: 'iife', // Immediately Invoked Function Expression for script tag
        target: ['es2020'],
        jsx: 'automatic',
        loader: { '.tsx': 'tsx', '.ts': 'ts' },
        banner: {
            js: '// Secret Namibia Chatbot Widget',
        },
    });
    console.log('Widget built successfully: public/widget.js');
}

build().catch(() => process.exit(1));
