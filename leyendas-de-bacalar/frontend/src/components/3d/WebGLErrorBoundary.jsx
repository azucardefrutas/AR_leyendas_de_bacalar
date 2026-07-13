import React from 'react';

/**
 * Wraps a react-three-fiber <Canvas> so a WebGL failure — failing to CREATE the
 * context, or losing it at runtime — renders a fallback INSTEAD of propagating up
 * to React Router's errorElement and crashing the whole page.
 *
 * three.js builds its WebGLRenderer as the <Canvas> mounts, so the throw happens
 * AT the canvas element. This boundary must therefore sit ABOVE <Canvas>; the
 * older boundaries lived INSIDE the canvas and only caught GLTF load errors.
 */
export default class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
