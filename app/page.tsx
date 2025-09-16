"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    router.push("/examples/all");
  }, [router]);

  return null;
};

export default Home;
