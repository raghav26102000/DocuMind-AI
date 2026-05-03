import Image from "next/image";

export default function KeyFeaturesSeection() {
  return (
    <section className="key-features">
      <h2 className="text-center">Key Benefits Features</h2>
      <div className="row align-items-center">
        <div className="col-md-6">
          <div className="key-feature-box">
            <div>
              <p>Eligibility Check in Minutes </p>
              <span>Know which schemes you qualify for instantly</span>
            </div>
          </div>
          <div className="key-feature-box">
            <div>
              <p>End-to-End Application Support</p>
              <span>We collect, prepare, and file your applications</span>
            </div>
          </div>
          <div className="key-feature-box">
            <div>
              <p>One-Time Document Upload </p>
              <span>Just share your documents once — we`ll do the rest</span>
            </div>
          </div>
          <div className="key-feature-box">
            <div>
              <p>Track Application Status</p>
              <span>
                Get real-time updates on your scheme application progress
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <Image
            src="/imgs/key-features-img.png"
            alt=""
            width={9999}
            height={9999}
          />
        </div>
      </div>
    </section>
  );
}
