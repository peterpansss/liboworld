import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Founder.css';

// /founder — "About Us" page. Intentionally minimal: a single media card
// with a short intro video of the founder + friends introducing Libo World.
// Linked from the FounderCard CTA on the home page.
//
// Placeholder src: noah-loop.mp4 (the gym loop also used on the home page).
// Replace with the real intro video when it's recorded.
export default function Founder() {
  return (
    <div className="founder-page">
      <SiteNav />

      <main className="fp-intro-main">
        <div className="fp-intro-card">
          <video
            src="/founder/noah-loop.mp4"
            poster="/founder/noah-loop-poster.jpg"
            controls
            playsInline
            preload="metadata"
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
