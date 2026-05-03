import Image from "next/image";

export default function AboutUsSection() {
  return (
    <section className="about-us">
      <div className="row align-items-center">
        <div className="col-md-6">
          <h2>About us</h2>
          <p>
            Saral Sewa is a National Platform that aims to offer one-stop search
            and discovery of the Government schemes.
          </p>
          <p>
            It provides an innovative, technology-based solution to discover
            scheme information based upon the eligibility of the citizen.
          </p>
          <p>
            The platform helps the citizen to find the right Government schemes
            for them. It also guides on how to apply for different Government
            schemes. Thus no need to visit multiple Government websites.
          </p>
          <button className="btn btn-outline-primary">More About Us</button>
        </div>
        <div className="col-md-6"></div>
      </div>
    </section>
  );
}
