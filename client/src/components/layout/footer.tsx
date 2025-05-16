import { Link } from "wouter";
import {
  Mountain,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  SendHorizonal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-secondary text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center mb-4">
              <Mountain className="text-primary h-6 w-6 mr-2" />
              <span className="text-white font-heading font-bold text-xl">
                MTB FANTASY
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              The ultimate fantasy league for downhill mountain biking fans.
              Build your team and compete with friends throughout the UCI
              Downhill World Cup season.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-lg mb-4">QUICK LINKS</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <span className="text-gray-400 hover:text-primary transition cursor-pointer">
                    Home
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/rules">
                  <span className="text-gray-400 hover:text-primary transition cursor-pointer">
                    How to Play
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/rules">
                  <span className="text-gray-400 hover:text-primary transition cursor-pointer">
                    Rules
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/races">
                  <a className="text-gray-400 hover:text-primary transition">
                    Race Schedule
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/team-builder">
                  <a className="text-gray-400 hover:text-primary transition">
                    Team Builder
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/leaderboard">
                  <a className="text-gray-400 hover:text-primary transition">
                    Leaderboards
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-lg mb-4">CONTACT US</h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Mail className="text-primary h-5 w-5 mr-3" />
                <a
                  href="mailto:info@mtbfantasy.com"
                  className="text-gray-400 hover:text-primary transition"
                >
                  info@mtbfantasy.com
                </a>
              </li>
              <li className="flex items-center">
                <Phone className="text-primary h-5 w-5 mr-3" />
                <a
                  href="tel:+15551234567"
                  className="text-gray-400 hover:text-primary transition"
                >
                  +1 (555) 123-4567
                </a>
              </li>
            </ul>
            <div className="mt-6">
              <h5 className="font-heading font-semibold text-sm mb-3">
                SUBSCRIBE TO UPDATES
              </h5>
              <div className="flex">
                <Input
                  type="email"
                  placeholder="Your email"
                  className="bg-gray-800 text-white px-3 py-2 rounded-l-md focus:outline-none w-full border-none focus:ring-primary"
                />
                <Button className="bg-primary hover:bg-red-700 text-white px-4 py-2 rounded-r-md transition duration-200 h-10">
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
          <p>&copy; 2025 MTB Fantasy League. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="text-gray-500 hover:text-primary transition">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 hover:text-primary transition">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-primary transition">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
