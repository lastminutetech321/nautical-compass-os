import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import LegalDisclaimer from "@/components/legal/LegalDisclaimer";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-[220px]">
        <TopBar />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="p-4 pt-0 md:p-6 md:pt-0"><LegalDisclaimer compact /></footer>
      </div>
    </div>
  );
}
