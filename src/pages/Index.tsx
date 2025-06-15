import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Home, Mail, Phone, LogIn, FileText } from "lucide-react";

// Replace with a beautiful Unsplash or placeholder business/ERP-appropriate image
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80";

const COMPANY_MOTTO = "Empowering Businesses Through Seamless Garment Production Solutions!";
const HOW_WE_WORK = [
  {
    title: "Consultation",
    text: "We discuss requirements and understand your vision.",
  },
  {
    title: "Collaborative Planning",
    text: "Our expert team crafts tailored production strategies.",
  },
  {
    title: "Execution",
    text: "Robust operations ensure timely, high-quality deliveries.",
  },
  {
    title: "Support & Feedback",
    text: "We’re with you at every step, ensuring continual improvement.",
  },
];

export default function Index() {
  const navigate = useNavigate();

  // Dialog states
  const [openQuery, setOpenQuery] = useState(false);
  const [openQuote, setOpenQuote] = useState(false);
  const [openOrder, setOpenOrder] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-accent/20">
      {/* Hero Section with image */}
      <section className="relative w-full h-[410px] md:h-[500px] flex items-center justify-center overflow-hidden">
        <img
          src={HERO_IMAGE_URL}
          alt="Garment production, technology, or business workflow"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-[.56] md:brightness-[.70]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 via-black/40 to-accent/50 opacity-80" />
        <header className="relative z-10 container mx-auto px-4 pt-8 pb-2 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 bg-white/30 backdrop-blur-md p-2 rounded-xl shadow">
            <span className="bg-primary/20 rounded-full p-3">
              <Home size={32} className="text-primary" />
            </span>
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent text-transparent bg-clip-text drop-shadow">StitchFlow Suite</span>
          </div>
          {/* Only the Login button remains in the nav */}
          <nav className="flex gap-2 bg-white/30 backdrop-blur-md p-2 rounded-xl shadow">
            <Button variant="default" onClick={() => navigate("/login")}>
              <LogIn className="mr-2" size={18} />
              Login
            </Button>
          </nav>
        </header>
        <div className="relative z-10 mt-10 flex flex-col items-center justify-center w-full">
          <h1 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight text-center drop-shadow-xl mb-5 animate-fade-in [--animation-delay:250ms] max-w-3xl">
            {COMPANY_MOTTO}
          </h1>
          <p className="text-lg md:text-xl font-medium text-white/90 text-center max-w-xl bg-black/40 rounded-lg px-4 py-2 mb-2 shadow-lg animate-fade-in [--animation-delay:400ms]">
            StitchFlow Suite delivers technology-driven solutions for seamless clothing production, delivering efficiency and reliability from design to delivery.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-6 px-8 py-4 text-lg shadow-lg hover:scale-105 transition-all animate-scale-in"
            onClick={() => setOpenQuote(true)}
          >
            <FileText className="mr-2" />Request a Quotation
          </Button>
        </div>
      </section>

      {/* How We Work */}
      <section className="container mx-auto px-4 mt-[-65px] md:mt-[-90px] mb-8 relative z-20">
        <div className="rounded-3xl bg-white/70 backdrop-blur-lg shadow-xl p-8 pt-14 md:p-12 border-2 border-primary/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-7 text-center bg-gradient-to-r from-primary via-secondary to-accent text-transparent bg-clip-text animate-fade-in">
            How We Work
          </h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_WE_WORK.map((step, idx) => (
              <Card
                key={step.title}
                className={`shadow-xl transition-all duration-300 bg-white/80 hover:bg-accent/10 border-2 hover:border-accent/70 hover:-translate-y-2 animate-scale-in`}
                style={{ animationDelay: `${180 + idx * 60}ms` } as React.CSSProperties}
              >
                <CardContent className="flex flex-col items-center p-6">
                  <span className="bg-primary/10 border-2 border-primary/30 rounded-xl px-4 py-2 font-semibold text-primary mb-3 text-base">
                    {step.title}
                  </span>
                  <span className="text-muted-foreground text-[15px] text-center">{step.text}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Call To Action */}
      <section className="container mx-auto px-4 flex flex-col md:flex-row gap-10 mb-16">
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-lg mx-auto md:mx-0 bg-gradient-to-br from-secondary/60 via-white/80 to-accent/40 rounded-3xl border shadow-2xl p-8 flex flex-col gap-6 items-center animate-scale-in">
            <h3 className="text-2xl md:text-3xl font-bold mb-2 text-center bg-gradient-to-r from-primary via-accent to-secondary text-transparent bg-clip-text drop-shadow">
              For Customers
            </h3>
            <div className="flex flex-col gap-4 w-full">
              <Button variant="secondary" className="w-full shadow hover:scale-105 transition" onClick={() => setOpenQuery(true)}>
                <Mail className="mr-2"/>
                Submit Query
              </Button>
              <Button variant="outline" className="w-full shadow hover:scale-105 transition" onClick={() => setOpenQuote(true)}>
                <FileText className="mr-2"/>
                Request Quotation
              </Button>
              <Button variant="default" className="w-full shadow hover:scale-105 transition" onClick={() => setOpenOrder(true)}>
                <Phone className="mr-2"/>
                Order Now
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-3">
              Have a question or project? Reach out directly!
            </div>
          </div>
        </div>
        {/* Optionally, add a decorative or second image, for illustration purposes */}
        <div className="hidden md:block flex-1 flex justify-end items-center h-[280px]">
          <img
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80"
            alt="People at work"
            className="rounded-3xl shadow-xl border-2 border-primary/20 h-full object-cover object-center"
          />
        </div>
      </section>

      {/* Dialogs */}
      <Dialog open={openQuery} onOpenChange={setOpenQuery}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Your Name" />
            <Input placeholder="Your Email" type="email" />
            <Textarea placeholder="Your Query" rows={3} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" onClick={() => setOpenQuery(false)}>Send</Button>
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openQuote} onOpenChange={setOpenQuote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Your Name" />
            <Input placeholder="Company/Business" />
            <Input placeholder="Email" type="email" />
            <Textarea placeholder="What do you need a quote for?" rows={3} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" onClick={() => setOpenQuote(false)}>Request</Button>
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openOrder} onOpenChange={setOpenOrder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place an Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Your Name" />
            <Input placeholder="Email" type="email" />
            <Input placeholder="Product/Service Requested" />
            <Textarea placeholder="Order details or requirements" rows={3} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" onClick={() => setOpenOrder(false)}>Submit</Button>
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
