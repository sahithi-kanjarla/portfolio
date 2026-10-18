import globe from "@/assets/obj3d-globe.webp";
import camera from "@/assets/rabbit-hole/camera.webp";
import code from "@/assets/rabbit-hole/code.webp";
import cursor from "@/assets/rabbit-hole/cursor.webp";
import folder from "@/assets/rabbit-hole/folder.webp";
import laptop from "@/assets/rabbit-hole/laptop.webp";
import phone from "@/assets/rabbit-hole/phone.webp";
import sparkles from "@/assets/rabbit-hole/sparkles.webp";

export type Project = {
  title: string;
  tags: string[];
  blurb: string;
  long: string;
  object: string;
  shot?: string;
  live?: string;
  code?: string;
  npm?: string;
};

export const projects: Project[] = [
  {
    title: "GreenSwap",
    tags: ["AI Agents", "Sustainable Tech", "Search"],
    object: globe,
    blurb: "find the greener choice. see the evidence.",
    long: "An AI shopping research agent that investigates sustainable alternatives to everyday products. It searches the live web, compares product suitability and prices, evaluates environmental claims, and links recommendations to supporting evidence. Rather than blindly ranking products, it distinguishes verified facts from brand claims and uncertainty, critiques its own findings, and can conclude when there is no clear winner. Built with model fallbacks, caching, guardrails, and regression tests.",
    code: "https://github.com/sahithi-kanjarla/GreenSwap.git",
  },
  {
    title: "Doodle Dance",
    tags: ["Computer Vision", "Interactive", "Web App"],
    object: sparkles,
    blurb: "draw a dancer. become the dancer.",
    long: "An interactive experience that brings hand-drawn stick figures to life. Draw a character, track your body pose through a webcam, and watch your drawing mirror your movements through an automatically rigged skeleton. Customize joints, choose preset characters, and join themed dance rooms with up to 12 people, music, and visual effects. Includes idle animations for when the camera is off.",
    live: "https://doodledance.onrender.com",
    code: "https://github.com/sahithi-kanjarla/DoodleDance.git",
  },
  {
    title: "Together Flow",
    tags: ["Productivity", "Social Accountability", "PWA"],
    object: phone,
    blurb: "a little momentum goes a long way.",
    long: "A supportive productivity experience built around a simple idea: showing up is easier when you don't have to do it alone. Plan weekly priorities, organize daily tasks, create private challenges with friends, and join shared work sessions. The goal is to turn small completed tasks into sustainable momentum without public feeds, competitive leaderboards, or pressure-driven streaks.",
    code: "https://github.com/sahithi-kanjarla/together-flow",
  },
  {
    title: "VisionVoice AI",
    tags: ["Computer Vision", "Accessibility", "AI"],
    object: camera,
    blurb: "helping people see through sound.",
    long: "An assistive vision system that converts visual surroundings into spoken descriptions. Uses OpenCV and YOLOv8 for object detection, BLIP for image captioning and scene understanding, and gTTS to deliver audio feedback. Explores how computer vision and speech synthesis can make everyday visual information more accessible to people with visual impairments.",
    code: "https://github.com/sahithi-kanjarla/vision-voice",
  },
  {
    title: "NutriSense",
    tags: ["AI", "Full Stack", "Nutrition"],
    object: globe,
    blurb: "a smarter way to understand your pantry.",
    long: "An AI-powered nutrition and digital pantry application that connects food inventory, meal tracking, and personal health goals. Uses the Gemini API to support pantry-aware food recommendations and nutrition guidance, with React, PostgreSQL, and Supabase powering the application experience and data layer. Designed to make food choices more practical and personalized.",
    code: "https://github.com/sahithi-kanjarla/nutrisense",
  },
  {
    title: "Chemical Equipment Parameter Visualization",
    tags: ["Django", "React", "Data Visualization"],
    object: laptop,
    blurb: "industrial data, made easier to read.",
    long: "A hybrid web and desktop analytics system for exploring chemical equipment parameters and performance. Combines Django REST APIs with a React dashboard and PyQt5 desktop interface, using Chart.js and Matplotlib to visualize parameter trends. Makes equipment readings easier to monitor, compare over time, and interpret through interactive charts.",
    code: "https://github.com/sahithi-kanjarla/Chemical-Equipment-Parameter-Visualizer",
  },
  {
    title: "HemoLink",
    tags: ["AWS", "Full Stack", "Team Project"],
    object: code,
    blurb: "connecting blood donors with people who need them.",
    long: "A cloud-based blood donation management platform developed as a team project. Built with React.js, AWS Lambda, Amazon DynamoDB, and Amazon Cognito, it supports role-based access and a donor–patient matching workflow. Explores how serverless cloud infrastructure can support a more organized and accessible donation process.",
    code: "https://github.com/ASindhu-14/hemolink",
  },
  {
    title: "Retail Sales Performance Dashboard",
    tags: ["Power BI", "DAX", "Business Analytics"],
    object: code,
    blurb: "which products sell — and which actually pay?",
    long: "An interactive Power BI dashboard built from order and detail datasets to compare sales performance with profitability. Tracks revenue, profit, average order value, quantity sold, and performance across states, customers, categories, sub-categories, and payment methods. Findings include Maharashtra leading sales, Clothing leading quantity sold, Printers contributing the highest profit, and March recording the highest monthly profit. Includes quarterly and state-level filters for deeper analysis.",
    code: "https://github.com/sahithi-kanjarla/Retail_Sales_Performance_Dashboard",
  },
  {
    title: "Employee Performance & Retention Analytics",
    tags: ["Power BI", "HR Analytics", "Data Analysis"],
    object: folder,
    blurb: "the numbers behind employee attrition.",
    long: "A Power BI workforce analytics dashboard built using a dataset of 1,400+ employee records. Explores workforce size, attrition, demographics, performance, and retention patterns through interactive reports. Enables analysis of where employee exits are concentrated and how turnover varies across workforce groups.",
    code: "https://github.com/sahithi-kanjarla/HR-Analytics-Dashboard",
  },
  {
    title: "Fashion Store Sales Analysis",
    tags: ["Excel", "PivotTables", "Data Analytics"],
    object: globe,
    blurb: "reading the patterns behind retail purchases.",
    long: "An Excel-based retail analysis using PivotTables and charts to examine purchasing patterns across product categories, customer segments, regions, and sales channels. Organizes transaction-level data into comparable summaries so sales distribution and differences between customer and product groups are easier to explore.",
    code: "https://github.com/sahithi-kanjarla/Fashion-store-excel-dashboard.git",
  },
  {
    title: "Smart Cane Stick",
    tags: ["Arduino", "IoT", "Accessibility"],
    object: cursor,
    blurb: "a simple sensor with a meaningful purpose.",
    long: "An Arduino-based assistive prototype that uses an ultrasonic sensor to detect nearby obstacles and a buzzer to alert the user. Demonstrates how low-cost embedded hardware and distance sensing can support basic obstacle awareness for people with visual impairments.",
    code: "https://github.com/sahithi-kanjarla/Smart-Cane-Stick",
  },
];
