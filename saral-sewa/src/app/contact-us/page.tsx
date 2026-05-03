"use client";

import Image from "next/image";
import "./contact-us.css";
const ContactUs = () => {
  return (
    <div className="contactUsWrapper">
      <section className="hero-section">
        <div className="hero-text">
          <h1 className="text-md-center">Contact Us</h1>
          <div className="contact-info-wrapper">
            <div className="row">
              <div className="col-md-6 me-md-0">
                <div className="location h-100">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d6742.324668757338!2d77.055097!3d28.443343!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d1861c62509d5%3A0x3caf827fea9a3fdf!2sTower-D%2C%20UNITECH%20CYBER%20PARK%2C%20Durga%20Colony%2C%20Sector%2039%2C%20Gurugram%2C%20Haryana%20122022!5e1!3m2!1sen!2sin!4v1752843479794!5m2!1sen!2sin"
                    className="border-0 h-100 w-100 rounded-3"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
              <div className="col-md-6">
                <div className="contact-details">
                  <div className="contact">
                    <div>
                      <div className="icon-wrapper">
                        <svg
                          width="60"
                          height="60"
                          viewBox="0 0 60 60"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M28.155 55.335C28.155 55.335 10 40.045 10 25C10 19.6957 12.1071 14.6086 15.8579 10.8579C19.6086 7.10714 24.6957 5 30 5C35.3043 5 40.3914 7.10714 44.1421 10.8579C47.8929 14.6086 50 19.6957 50 25C50 40.045 31.845 55.335 31.845 55.335C30.835 56.265 29.1725 56.255 28.155 55.335ZM30 33.75C31.1491 33.75 32.2869 33.5237 33.3485 33.0839C34.4101 32.6442 35.3747 31.9997 36.1872 31.1872C36.9997 30.3747 37.6442 29.4101 38.0839 28.3485C38.5237 27.2869 38.75 26.1491 38.75 25C38.75 23.8509 38.5237 22.7131 38.0839 21.6515C37.6442 20.5899 36.9997 19.6253 36.1872 18.8128C35.3747 18.0003 34.4101 17.3558 33.3485 16.9161C32.2869 16.4763 31.1491 16.25 30 16.25C27.6794 16.25 25.4538 17.1719 23.8128 18.8128C22.1719 20.4538 21.25 22.6794 21.25 25C21.25 27.3206 22.1719 29.5462 23.8128 31.1872C25.4538 32.8281 27.6794 33.75 30 33.75Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label>Address</label>
                      <p>BATRA HOUSE, RANBAXY CORPORATE</p>
                      <span>
                        HEADQUARTERS, Plot 52, Sector 32, Gurugram, Haryana
                        122001
                      </span>
                    </div>
                  </div>
                  <div className="contact">
                    <div>
                      <div className="icon-wrapper">
                        <svg
                          width="60"
                          height="60"
                          viewBox="0 0 60 60"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10 50C8.625 50 7.44833 49.5108 6.47 48.5325C5.49167 47.5542 5.00167 46.3767 5 45V15C5 13.625 5.49 12.4483 6.47 11.47C7.45 10.4917 8.62667 10.0017 10 10H50C51.375 10 52.5525 10.49 53.5325 11.47C54.5125 12.45 55.0017 13.6267 55 15V45C55 46.375 54.5108 47.5525 53.5325 48.5325C52.5542 49.5125 51.3767 50.0017 50 50H10ZM30 32.5L50 20V15L30 27.5L10 15V20L30 32.5Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label>Email</label>
                      <p>
                        <a href="mail:info@saralseva.in">info@saralseva.in</a>
                      </p>
                      <span></span>
                    </div>
                  </div>
                  <div className="contact">
                    <div>
                      <div className="icon-wrapper">
                        <svg
                          width="60"
                          height="60"
                          viewBox="0 0 60 60"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M49.875 52.5C44.6667 52.5 39.5208 51.365 34.4375 49.095C29.3542 46.825 24.7292 43.6058 20.5625 39.4375C16.3958 35.2692 13.1775 30.6442 10.9075 25.5625C8.6375 20.4808 7.50167 15.335 7.5 10.125C7.5 9.375 7.75 8.75 8.25 8.25C8.75 7.75 9.375 7.5 10.125 7.5H20.25C20.8333 7.5 21.3542 7.69833 21.8125 8.095C22.2708 8.49167 22.5417 8.96 22.625 9.5L24.25 18.25C24.3333 18.9167 24.3125 19.4792 24.1875 19.9375C24.0625 20.3958 23.8333 20.7917 23.5 21.125L17.4375 27.25C18.2708 28.7917 19.26 30.2808 20.405 31.7175C21.55 33.1542 22.8108 34.54 24.1875 35.875C25.4792 37.1667 26.8333 38.365 28.25 39.47C29.6667 40.575 31.1667 41.585 32.75 42.5L38.625 36.625C39 36.25 39.49 35.9692 40.095 35.7825C40.7 35.5958 41.2933 35.5433 41.875 35.625L50.5 37.375C51.0833 37.5417 51.5625 37.8442 51.9375 38.2825C52.3125 38.7208 52.5 39.21 52.5 39.75V49.875C52.5 50.625 52.25 51.25 51.75 51.75C51.25 52.25 50.625 52.5 49.875 52.5Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label>Phone</label>
                      <p>
                        <a href="tel:+919899976227">+91 98999 76227</a>
                      </p>
                      <span></span>
                    </div>
                  </div>
                  <div className="contact">
                    <div>
                      <label>Contact</label>
                      <p>Contact us for any help or to join our team</p>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;
