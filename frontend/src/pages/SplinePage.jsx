import { Suspense } from 'react';
import Spline from '@splinetool/react-spline';

export default function SplinePage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Suspense fallback={<div>Loading 3D scene...</div>}>
        <Spline scene="https://prod.spline.design/29Tapg2-bsw8cBkJ/scene.splinecode" />
      </Suspense>
    </div>
  );
}
