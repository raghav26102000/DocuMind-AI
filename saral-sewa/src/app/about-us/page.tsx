"use client";

import Image from "next/image";
import "./about-us.css";
const AboutUs = () => {
  return (
    <div className="aboutUsWrapper">
      <section className="hero-section">
        <Image
          src="/imgs/about-us-hero-img.png"
          alt="About Hero"
          width={99999}
          height={99999}
          className="hero-img"
        />
        <div className="hero-text">
          <h1>Our Vision</h1>
          <p>Our vision is to make citizens life easier</p>
          <h1>Our Mission</h1>
          <p>
            Our mission is to streamline the government–user interface for
            government schemes and benefits
          </p>
          <p>
            Reduce time and effort required to find and avail a government
            scheme
          </p>
        </div>
      </section>

      <section className="about-us">
        <div className="row">
          <div className="col-md-4">
            <Image
              src="/imgs/about-us-img1.png"
              alt="About 1"
              className="w-100 h-auto mb-4"
              width={99999}
              height={99999}
            />
          </div>
          <div className="col-md-8">
            <p>
              myScheme is a National Platform that aims to offer one-stop search
              and discovery of the Government schemes.
            </p>
            <p>
              It provides an innovative, technology-based solution to discover
              scheme information based upon the eligibility of the citizen.
            </p>
            <p>
              The platform helps the citizen to find the right Government
              schemes for them. It also guides on how to apply for different
              Government schemes. Thus no need to visit multiple Government
              websites.
            </p>
            <p>
              myScheme platform is Developed, Managed, and Operated by National
              e-Governance Division (NeGD), with the Support of Ministry of
              Electronics and Information Technology (MeitY), Department of
              Administrative Reforms and Public Grievance (DARPG) and in
              partnership with other Central and State Ministries/Departments.
            </p>
          </div>
        </div>
      </section>

      <section className="process-scheme">
        <h2 className="text-center">Process for Scheme</h2>
        <div className="process-box-container">
          <div className="process-box">
            <Image
              src="/imgs/process-img1.png"
              width={99999}
              height={99999}
              alt="Eligibility Check"
            />
            <span className="process-title">Eligibility Check</span>
            <span className="process-desc">
              Quickly determine if you qualify for various government schemes
              with simple questions.
            </span>
          </div>
          <div className="process-box">
            <Image
              src="/imgs/process-img2.png"
              width={99999}
              height={99999}
              alt="Scheme Finder"
            />
            <span className="process-title">Scheme Finder</span>
            <span className="process-desc">
              Our smart system prefills forms using your provided information,
              saving you time and effort.
            </span>
          </div>
          <div className="process-box">
            <Image
              src="/imgs/process-img3.png"
              width={99999}
              height={99999}
              alt="Scheme in Detail"
            />
            <span className="process-title">Scheme in detail</span>
            <span className="process-desc">
              Deep dive into dedicated scheme pages for fine grained scheme
              details before you apply
            </span>
          </div>
        </div>
        <div className="text-center">
          <button className="btn btn-primary">Register Now</button>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
