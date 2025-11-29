import Spline from '@splinetool/react-spline';

export default function SplineScene() {
  return (
    <div className="spline-container" style={{ width: '100%', height: '100vh' }}>
      <Spline scene="https://prod.spline.design/29Tapg2-bsw8cBkJ/scene.splinecode" />
    </div>
  );
}
