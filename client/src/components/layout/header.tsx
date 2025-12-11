import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger
} from "@/components/ui/sheet";
import { Menu, Mountain, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { safeImageUrl } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/" },
  { name: "My Team", href: "/team-builder" },
  { name: "Races", href: "/races" },
  { name: "Leaderboard", href: "/leaderboard" },
  { name: "Rules", href: "/rules" },
];

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdminUser = !!user?.isAdmin;

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <header className="bg-secondary shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <Mountain className="text-primary h-6 w-6 mr-2" />
              <span className="text-white font-heading font-bold text-xl md:text-2xl">MTB FANTASY</span>
            </div>
          </Link>
        </div>
        
        <nav className="hidden md:flex space-x-6">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className={`text-white hover:text-primary font-body font-semibold transition duration-200 cursor-pointer ${
                location === item.href ? "text-primary" : ""
              }`}>
                {item.name}
              </div>
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={safeImageUrl(user?.profileImageUrl)} alt={user?.firstName || "User"} />
                <AvatarFallback className="bg-primary text-white">
                  {getInitials(user?.firstName || "User")}
                </AvatarFallback>
              </Avatar>
              {isAdminUser && (
                <Link href="/admin">
                  <div className="flex items-center text-white hover:text-primary font-body font-semibold transition duration-200 cursor-pointer">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin
                  </div>
                </Link>
              )}
              <a href="/api/logout" className="text-white hover:text-primary font-body font-semibold transition duration-200">
                Logout
              </a>
            </div>
          ) : (
            <a href="/login" className="hidden md:block bg-primary hover:bg-red-700 text-white font-heading font-bold px-4 py-2 rounded-md transition duration-200">
              SIGN IN
            </a>
          )}
          
          <div className="md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:text-primary focus:outline-none">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[385px] bg-secondary text-white border-l border-gray-700">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center">
                    <Mountain className="text-primary h-6 w-6 mr-2" />
                    <span>MTB FANTASY</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-6">
                  <nav className="flex flex-col space-y-4">
                    {navigation.map((item) => (
                      <Link key={item.name} href={item.href}>
                        <div
                          className={`text-white hover:text-primary font-body font-semibold transition px-2 py-2 cursor-pointer ${
                            location === item.href ? "bg-gray-800 text-primary" : ""
                          }`}
                          onClick={() => setMenuOpen(false)}
                        >
                          {item.name}
                        </div>
                      </Link>
                    ))}
                    {isAdminUser && (
                      <Link href="/admin">
                        <div
                          className={`text-white hover:text-primary font-body font-semibold transition px-2 py-2 cursor-pointer ${
                            location === "/admin" ? "bg-gray-800 text-primary" : ""
                          }`}
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin
                        </div>
                      </Link>
                    )}
                  </nav>
                </div>
                <div className="absolute bottom-4 w-full pr-8">
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 px-2 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={safeImageUrl(user?.profileImageUrl)} alt={user?.firstName || "User"} />
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials(user?.firstName || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white font-semibold">{user?.firstName || "User"}</span>
                      </div>
                      <a 
                        href="/api/logout" 
                        className="bg-primary hover:bg-red-700 text-white font-heading font-bold px-4 py-2 rounded-md transition duration-200 text-center"
                      >
                        SIGN OUT
                      </a>
                    </div>
                  ) : (
                    <a
                      href="/login"
                      className="w-full bg-primary hover:bg-red-700 text-white font-heading font-bold px-4 py-2 rounded-md transition duration-200 text-center block"
                    >
                      SIGN IN
                    </a>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
