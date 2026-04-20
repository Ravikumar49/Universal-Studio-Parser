🚀 Universal Compiler Laboratory

A comprehensive, interactive web-based tool for exploring, simulating, and comparing compiler parsing algorithms. Built with a strong focus on software engineering principles, modularity, and algorithm visualization, this project bridges the gap between abstract compiler mathematics and a clean, modern educational interface.

## ✨ Key Features

* **Grammar Preprocessing:** Automatically eliminates Left Recursion and performs Left Factoring.
* **Core Math Engines:** Dynamically computes `FIRST` and `FOLLOW` sets for any given Context-Free Grammar (CFG).
* **Top-Down Parsing:** Predictive LL(1) table generation and conflict detection.
* **Bottom-Up Parsing (LR Family):** * Generates state machines (Canonical Collections) and parsing tables for **LR(0)**, **SLR(1)**, **CLR(1)**, and **LALR(1)**.
  * Flawless LALR(1) state compression via core-matching algorithms.
* **Live Stack Simulator:** Step-by-step tracing of the parsing stack, input buffer, and actions.
* **Abstract Syntax Tree (AST) Visualization:** Real-time, dynamic parse tree rendering using Vis.js.
* **Lexical Analysis & Symbol Table:** Tracks variable assignments and data types in a live memory table during simulation.
* **Universal Comparison Dashboard:** A real-time analytics module that compares total state counts and grammar acceptance (conflict detection) across all 5 parsers simultaneously.

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Visualization:** [Vis.js](https://visjs.org/) (for interactive Parse Trees)
* **Architecture:** Pure client-side processing for instant mathematical feedback.

## 🚀 Getting Started

Since this is a fully client-side application, no heavy backend installation is required.

1. **Clone the repository:**
