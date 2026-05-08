# prediction/main.py - v5
# Each place gets UNIQUE crowd based on its real popularity + time
# Bus stands, airports, markets added

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import hashlib

app = FastAPI(title="VisitWise AI v5")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─────────────────────────────────────────────────────────────
# BASE PATTERNS per category (0-100%)
# 0=Monday...6=Sunday, index=hour
# ─────────────────────────────────────────────────────────────
BASE_PATTERNS = {
  "mall": {
    0:[0,0,0,0,0,0,0,0,10,15,25,40,55,50,40,45,55,65,75,70,55,35,15,5],
    1:[0,0,0,0,0,0,0,0,10,15,25,40,55,50,40,45,55,65,75,70,55,35,15,5],
    2:[0,0,0,0,0,0,0,0,10,15,25,40,55,50,40,45,55,65,80,75,60,40,20,5],
    3:[0,0,0,0,0,0,0,0,10,15,25,40,55,50,40,45,55,65,80,75,60,40,20,5],
    4:[0,0,0,0,0,0,0,0,10,15,30,45,60,55,50,60,70,80,90,88,75,55,30,10],
    5:[0,0,0,0,0,0,5,10,20,35,55,75,90,95,92,90,88,92,95,90,80,65,40,15],
    6:[0,0,0,0,0,0,5,10,25,45,65,80,88,90,88,85,82,80,78,72,60,45,25,10],
  },
  "cafe": {
    0:[0,0,0,0,0,0,5,20,40,60,65,70,75,65,55,50,55,60,65,55,40,25,10,0],
    1:[0,0,0,0,0,0,5,20,40,60,65,70,75,65,55,50,55,60,65,55,40,25,10,0],
    2:[0,0,0,0,0,0,5,20,40,60,65,72,78,68,58,52,58,62,68,58,42,28,12,0],
    3:[0,0,0,0,0,0,5,20,40,60,65,72,78,68,58,52,58,62,68,58,42,28,12,0],
    4:[0,0,0,0,0,0,5,22,45,65,70,80,85,75,65,60,65,72,78,68,55,38,18,5],
    5:[0,0,0,0,0,0,5,15,28,45,62,78,88,90,85,80,82,86,82,72,55,38,20,5],
    6:[0,0,0,0,0,0,5,15,32,52,70,82,90,88,82,78,74,72,66,56,42,28,12,0],
  },
  "gym": {
    0:[0,0,0,0,0,25,65,88,92,72,45,30,35,30,25,30,40,72,90,92,78,52,25,5],
    1:[0,0,0,0,0,20,58,82,88,68,40,28,30,28,22,28,38,68,85,88,72,46,20,5],
    2:[0,0,0,0,0,20,58,82,88,68,40,28,30,28,22,28,38,68,85,88,72,46,20,5],
    3:[0,0,0,0,0,20,58,82,88,68,40,28,30,28,22,28,38,68,85,88,72,46,20,5],
    4:[0,0,0,0,0,22,62,86,90,70,42,30,32,30,24,30,40,70,88,90,74,50,22,5],
    5:[0,0,0,0,0,12,38,62,78,82,78,68,58,48,40,36,42,58,68,62,48,32,15,0],
    6:[0,0,0,0,0,8,22,48,62,70,68,60,52,44,36,32,36,50,58,52,40,24,10,0],
  },
  "restaurant": {
    0:[0,0,0,0,0,0,0,5,10,15,30,72,92,88,62,30,20,28,58,82,88,68,32,5],
    1:[0,0,0,0,0,0,0,5,10,15,30,72,92,88,62,30,20,28,58,82,88,68,32,5],
    2:[0,0,0,0,0,0,0,5,10,15,32,74,94,90,64,32,22,30,60,84,90,70,34,5],
    3:[0,0,0,0,0,0,0,5,10,15,32,74,94,90,64,32,22,30,60,84,90,70,34,5],
    4:[0,0,0,0,0,0,0,5,10,20,42,82,96,92,72,42,32,42,72,92,96,82,46,10],
    5:[0,0,0,0,0,0,5,10,15,28,52,88,98,96,82,58,42,52,82,96,98,90,58,15],
    6:[0,0,0,0,0,0,5,10,22,38,62,90,96,94,78,52,40,48,78,92,94,82,50,12],
  },
  "park": {
    0:[0,0,0,0,0,18,45,55,38,22,15,18,22,18,15,20,28,40,48,38,24,12,5,0],
    1:[0,0,0,0,0,18,45,55,38,22,15,18,22,18,15,20,28,40,48,38,24,12,5,0],
    2:[0,0,0,0,0,18,45,55,38,22,15,18,22,18,15,20,28,40,48,38,24,12,5,0],
    3:[0,0,0,0,0,18,45,55,38,22,15,18,22,18,15,20,28,40,48,38,24,12,5,0],
    4:[0,0,0,0,0,20,48,58,42,25,18,20,25,20,18,22,32,44,52,44,30,16,6,0],
    5:[0,0,0,0,0,22,55,74,80,72,58,50,46,42,42,48,58,72,76,68,52,36,18,5],
    6:[0,0,0,0,0,28,62,80,85,78,65,55,50,46,46,50,62,74,78,70,55,40,22,5],
  },
  "zoo": {
    0:[0,0,0,0,0,0,0,5,18,45,68,78,75,72,70,68,62,52,38,22,8,2,0,0],
    1:[0,0,0,0,0,0,0,5,18,45,68,78,75,72,70,68,62,52,38,22,8,2,0,0],
    2:[0,0,0,0,0,0,0,5,18,45,68,78,75,72,70,68,62,52,38,22,8,2,0,0],
    3:[0,0,0,0,0,0,0,5,18,45,68,78,75,72,70,68,62,52,38,22,8,2,0,0],
    4:[0,0,0,0,0,0,0,8,22,50,72,82,80,78,75,72,65,55,40,25,10,3,0,0],
    5:[0,0,0,0,0,0,8,18,35,65,85,94,96,94,90,88,82,72,58,40,22,8,2,0],
    6:[0,0,0,0,0,0,8,22,40,70,88,96,98,96,92,90,84,74,60,42,24,10,3,0],
  },
  "tourist": {
    0:[0,0,0,0,0,8,25,48,62,58,52,54,56,54,52,55,62,70,75,65,45,25,10,2],
    1:[0,0,0,0,0,8,25,48,62,58,52,54,56,54,52,55,62,70,75,65,45,25,10,2],
    2:[0,0,0,0,0,8,25,48,62,58,52,54,56,54,52,55,62,70,75,65,45,25,10,2],
    3:[0,0,0,0,0,8,25,48,62,58,52,54,56,54,52,55,62,70,75,65,45,25,10,2],
    4:[0,0,0,0,0,8,28,52,66,62,56,58,60,58,56,60,66,74,80,72,52,28,12,3],
    5:[0,0,0,0,0,10,32,62,80,85,82,80,78,76,72,76,82,88,92,85,68,45,22,5],
    6:[0,0,0,0,0,12,36,66,84,88,85,83,80,78,75,78,84,90,94,88,72,48,24,6],
  },
  "cinema": {
    0:[0,0,0,0,0,0,0,0,5,10,15,20,38,55,48,42,52,62,82,92,88,68,32,5],
    1:[0,0,0,0,0,0,0,0,5,10,15,20,38,55,48,42,52,62,82,92,88,68,32,5],
    2:[0,0,0,0,0,0,0,0,5,10,15,20,38,55,48,42,52,62,82,92,88,68,32,5],
    3:[0,0,0,0,0,0,0,0,5,10,15,20,38,55,48,42,52,62,82,92,88,68,32,5],
    4:[0,0,0,0,0,0,0,0,5,12,22,32,52,68,62,58,68,78,92,96,94,82,52,15],
    5:[0,0,0,0,0,0,0,8,18,28,44,64,82,90,88,85,88,92,96,98,96,88,62,22],
    6:[0,0,0,0,0,0,0,8,22,38,58,75,88,90,88,82,85,88,92,94,90,78,52,16],
  },
  # ── Bus Stand — always busy, peak morning/evening ────────
  "bus_stand": {
    0:[5,5,5,5,5,20,55,80,85,70,55,60,65,60,55,60,70,80,88,82,65,45,25,10],
    1:[5,5,5,5,5,20,55,80,85,70,55,60,65,60,55,60,70,80,88,82,65,45,25,10],
    2:[5,5,5,5,5,20,55,80,85,70,55,60,65,60,55,60,70,80,88,82,65,45,25,10],
    3:[5,5,5,5,5,20,55,80,85,70,55,60,65,60,55,60,70,80,88,82,65,45,25,10],
    4:[5,5,5,5,5,22,58,82,88,72,58,62,68,62,58,62,72,84,92,88,70,48,28,12],
    5:[8,8,8,8,8,25,60,82,88,80,72,75,78,75,72,78,82,88,92,88,75,55,35,15],
    6:[8,8,8,8,8,22,55,78,85,78,68,72,75,72,68,72,78,85,88,82,70,50,30,12],
  },
  # ── Airport — 24/7, peaks at morning and evening flights ─
  "airport": {
    0:[35,30,28,25,30,45,65,80,85,72,60,58,62,60,58,62,72,82,88,85,75,60,50,42],
    1:[35,30,28,25,30,45,65,80,85,72,60,58,62,60,58,62,72,82,88,85,75,60,50,42],
    2:[35,30,28,25,30,45,65,80,85,72,60,58,62,60,58,62,72,82,88,85,75,60,50,42],
    3:[35,30,28,25,30,45,65,80,85,72,60,58,62,60,58,62,72,82,88,85,75,60,50,42],
    4:[35,30,28,25,30,48,68,82,88,75,62,60,64,62,60,65,75,85,92,90,80,65,55,45],
    5:[40,35,30,28,32,50,70,85,90,80,68,65,68,65,62,68,78,88,92,90,82,68,58,48],
    6:[38,32,28,26,30,48,68,82,88,78,65,62,65,62,60,65,75,85,90,88,78,65,55,45],
  },
  # ── Market — busy during day, very peak weekend ──────────
  "market": {
    0:[0,0,0,0,0,0,5,15,35,55,70,78,75,72,68,72,78,82,80,70,50,28,10,0],
    1:[0,0,0,0,0,0,5,15,35,55,70,78,75,72,68,72,78,82,80,70,50,28,10,0],
    2:[0,0,0,0,0,0,5,15,35,55,70,78,75,72,68,72,78,82,80,70,50,28,10,0],
    3:[0,0,0,0,0,0,5,15,35,55,70,78,75,72,68,72,78,82,80,70,50,28,10,0],
    4:[0,0,0,0,0,0,5,18,40,60,74,82,80,76,72,76,82,86,84,75,55,32,12,0],
    5:[0,0,0,0,0,0,8,22,48,70,85,92,90,88,85,88,92,95,92,82,65,42,18,5],
    6:[0,0,0,0,0,0,8,22,52,75,88,95,92,90,88,90,94,96,92,84,68,45,20,5],
  },
}

DEFAULT = [0,0,0,0,0,0,5,10,20,35,50,60,65,60,55,55,60,65,70,65,50,35,15,5]

# ─────────────────────────────────────────────────────────────
# PLACE-SPECIFIC MODIFIERS
# Each named place gets unique crowd based on its popularity
# ─────────────────────────────────────────────────────────────
PLACE_MODIFIERS = {
  # ── Tourist ───────────────────────────────────────────────
  "india gate":              {"mult":1.4,"peak_days":[5,6],"peak_hours":range(17,21),"open_from":6,"open_until":22},
  "taj mahal":               {"mult":1.5,"peak_days":[5,6],"peak_hours":range(9,16), "open_from":6,"open_until":18,"closed_day":2},
  "red fort":                {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,17),"open_from":9,"open_until":17},
  "qutub minar":             {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,16),"open_from":7,"open_until":18},
  "gateway of india":        {"mult":1.4,"peak_days":[5,6],"peak_hours":range(17,21),"open_from":6,"open_until":22},
  "golden temple":           {"mult":1.6,"peak_days":[5,6],"peak_hours":range(5,9),  "open_from":4,"open_until":22},
  "varanasi ghat":           {"mult":1.4,"peak_days":[5,6],"peak_hours":range(5,8),  "open_from":4,"open_until":22},
  "lotus temple":            {"mult":1.2,"peak_days":[5,6],"peak_hours":range(10,17),"open_from":9,"open_until":17,"closed_day":0},
  "akshardham":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,18),"open_from":9,"open_until":20,"closed_day":0},
  "hawa mahal":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(9,15), "open_from":9,"open_until":16},
  "mysore palace":           {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,17),"open_from":10,"open_until":17},
  "victoria memorial":       {"mult":1.2,"peak_days":[5,6],"peak_hours":range(10,17),"open_from":10,"open_until":17,"closed_day":0},

  # ── Zoos ─────────────────────────────────────────────────
  "patna zoo":               {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,15),"open_from":8,"open_until":17},
  "delhi zoo":               {"mult":1.4,"peak_days":[5,6],"peak_hours":range(10,15),"open_from":8,"open_until":17,"closed_day":0},
  "mysore zoo":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,15),"open_from":8,"open_until":17},
  "alipore zoo":             {"mult":1.2,"peak_days":[5,6],"peak_hours":range(10,15),"open_from":8,"open_until":17},
  "nehru zoological":        {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,15),"open_from":8,"open_until":17},
  "bannerghatta":            {"mult":1.2,"peak_days":[5,6],"peak_hours":range(10,16),"open_from":9,"open_until":17},

  # ── Malls — Each mall has DIFFERENT popularity ───────────
  # High popularity malls
  "select citywalk":         {"mult":1.5,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":23},
  "dlf cyberhub":            {"mult":1.4,"peak_days":[4,5,6],"peak_hours":range(18,23),"open_from":10,"open_until":23},
  "ambience mall":           {"mult":1.4,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  "phoenix marketcity":      {"mult":1.4,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  "lulu mall":               {"mult":1.5,"peak_days":[5,6],"peak_hours":range(12,21),"open_from":10,"open_until":22},
  "quest mall":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  # Medium popularity malls
  "forum mall":              {"mult":1.2,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  "inorbit mall":            {"mult":1.2,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  "nexus mall":              {"mult":1.2,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  "r city mall":             {"mult":1.3,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  # Local/smaller malls — less crowd
  "z square mall":           {"mult":0.8,"peak_days":[5,6],"peak_hours":range(15,20),"open_from":10,"open_until":21},
  "fun republic":            {"mult":0.9,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},
  "elante mall":             {"mult":1.1,"peak_days":[5,6],"peak_hours":range(14,21),"open_from":10,"open_until":22},

  # ── Bus Stands ────────────────────────────────────────────
  "isbt":                    {"mult":1.4,"peak_days":[5,6],"peak_hours":range(7,10), "open_from":4,"open_until":24},
  "interstate bus":          {"mult":1.3,"peak_days":[5,6],"peak_hours":range(7,10), "open_from":4,"open_until":24},
  "bus terminal":            {"mult":1.3,"peak_days":[5,6],"peak_hours":range(7,10), "open_from":4,"open_until":24},
  "bus stand":               {"mult":1.2,"peak_days":[5,6],"peak_hours":range(7,10), "open_from":5,"open_until":23},
  "mithapur bus":            {"mult":1.2,"peak_days":[5,6],"peak_hours":range(7,10), "open_from":5,"open_until":22},

  # ── Airports ──────────────────────────────────────────────
  "indira gandhi":           {"mult":1.5,"peak_days":[4,5,6],"peak_hours":range(6,10),"open_from":0,"open_until":24},
  "chhatrapati shivaji airport":{"mult":1.5,"peak_days":[4,5,6],"peak_hours":range(6,10),"open_from":0,"open_until":24},
  "kempegowda airport":      {"mult":1.4,"peak_days":[4,5,6],"peak_hours":range(6,10),"open_from":0,"open_until":24},
  "jay prakash narayan airport":{"mult":1.2,"peak_days":[5,6],"peak_hours":range(7,10),"open_from":4,"open_until":22},
  "patna airport":           {"mult":1.2,"peak_days":[5,6],"peak_hours":range(7,10), "open_from":4,"open_until":22},
  "netaji subhas":           {"mult":1.4,"peak_days":[4,5,6],"peak_hours":range(6,10),"open_from":0,"open_until":24},
  "airport":                 {"mult":1.3,"peak_days":[4,5,6],"peak_hours":range(6,10),"open_from":0,"open_until":24},

  # ── Markets ───────────────────────────────────────────────
  "connaught place":         {"mult":1.4,"peak_days":[5,6],"peak_hours":range(12,21),"open_from":10,"open_until":21},
  "chandni chowk":           {"mult":1.5,"peak_days":[5,6],"peak_hours":range(11,20),"open_from":10,"open_until":20,"closed_day":0},
  "sarojini nagar":          {"mult":1.5,"peak_days":[5,6],"peak_hours":range(12,20),"open_from":9,"open_until":20},
  "lajpat nagar":            {"mult":1.3,"peak_days":[5,6],"peak_hours":range(12,20),"open_from":10,"open_until":20,"closed_day":0},
  "palika bazaar":           {"mult":1.3,"peak_days":[5,6],"peak_hours":range(12,21),"open_from":11,"open_until":21},
  "crawford market":         {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,19),"open_from":9,"open_until":19},
  "linking road":            {"mult":1.2,"peak_days":[5,6],"peak_hours":range(12,20),"open_from":10,"open_until":20},
  "new market kolkata":      {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,19),"open_from":9,"open_until":20},
  "burrabazar":              {"mult":1.4,"peak_days":[1,2,3,4],"peak_hours":range(9,17),"open_from":8,"open_until":18},
  "karol bagh":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(12,20),"open_from":10,"open_until":20,"closed_day":0},
  "manish market":           {"mult":1.2,"peak_days":[5,6],"peak_hours":range(11,19),"open_from":10,"open_until":19},
  "hill road bandra":        {"mult":1.2,"peak_days":[5,6],"peak_hours":range(12,20),"open_from":10,"open_until":21},

  # ── Cafes ─────────────────────────────────────────────────
  "starbucks":               {"mult":1.3,"peak_days":[5,6],"peak_hours":range(10,14),"open_from":7,"open_until":23},
  "cafe coffee day":         {"mult":1.1,"peak_days":[5,6],"peak_hours":range(11,14),"open_from":8,"open_until":22},
  "third wave":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(9,13), "open_from":7,"open_until":22},
  "blue tokai":              {"mult":1.3,"peak_days":[5,6],"peak_hours":range(9,13), "open_from":7,"open_until":22},
  "chaayos":                 {"mult":1.1,"peak_days":[5,6],"peak_hours":range(10,14),"open_from":8,"open_until":22},

  # ── Gyms ─────────────────────────────────────────────────
  "gold's gym":              {"mult":1.3,"peak_days":[0,4],"peak_hours":range(6,9),  "open_from":5,"open_until":22},
  "anytime fitness":         {"mult":1.2,"peak_days":[0,4],"peak_hours":range(6,9),  "open_from":0,"open_until":24},
  "cult.fit":                {"mult":1.4,"peak_days":[0,4],"peak_hours":range(7,10), "open_from":6,"open_until":21},
  "fitness first":           {"mult":1.2,"peak_days":[0,4],"peak_hours":range(6,9),  "open_from":5,"open_until":22},

  # ── Restaurants ──────────────────────────────────────────
  "mcdonalds":               {"mult":1.2,"peak_days":[5,6],"peak_hours":range(12,14),"open_from":8,"open_until":23},
  "kfc":                     {"mult":1.2,"peak_days":[5,6],"peak_hours":range(12,14),"open_from":10,"open_until":23},
  "dominos":                 {"mult":1.2,"peak_days":[5,6],"peak_hours":range(18,21),"open_from":10,"open_until":23},
  "barbeque nation":         {"mult":1.4,"peak_days":[5,6],"peak_hours":range(19,22),"open_from":12,"open_until":23},
  "haldiram":                {"mult":1.3,"peak_days":[5,6],"peak_hours":range(12,15),"open_from":8,"open_until":22},
}

COSTS = {
  "mall":"₹500 – ₹2,000","cafe":"₹150 – ₹400","gym":"Free (membership)",
  "restaurant":"₹200 – ₹800","park":"Free – ₹50","zoo":"₹50 – ₹200",
  "cinema":"₹200 – ₹500","tourist":"Free – ₹500",
  "bus_stand":"₹50 – ₹500 (ticket)","airport":"₹200 – ₹2,000",
  "market":"₹100 – ₹5,000",
}
PLACE_COSTS = {
  "taj mahal":"₹50 – ₹1,100 (entry)","red fort":"₹35 – ₹500",
  "india gate":"Free","golden temple":"Free","varanasi ghat":"Free",
  "patna zoo":"₹20 – ₹100","delhi zoo":"₹40 – ₹80",
  "lodhi garden":"Free","cubbon park":"Free",
  "chandni chowk":"₹100 – ₹3,000","sarojini nagar":"₹100 – ₹2,000",
  "connaught place":"₹200 – ₹5,000",
}

def find_modifier(name: str):
  n = name.lower()
  for key, mod in PLACE_MODIFIERS.items():
    if key in n:
      return mod
  return None

# ── Unique crowd variation per place ─────────────────────
def place_variation(place_name: str, category: str) -> float:
  """Each place gets a consistent unique variation (-15% to +15%)"""
  if not place_name:
    return 0
  # Use hash for consistent but unique variation per place
  h = int(hashlib.md5(place_name.lower().encode()).hexdigest()[:4], 16)
  variation = ((h % 30) - 15)  # -15 to +15
  return variation

def get_score(category: str, hour: int, day: int, place_name: str = "") -> int:
  cat = category
  # Map aliases
  if cat in ["bus_stand","bus stand","bus terminal"]: cat = "bus_stand"
  elif cat == "market": cat = "market"
  elif cat == "airport": cat = "airport"

  pattern = BASE_PATTERNS.get(cat, {})
  hourly  = pattern.get(day, DEFAULT)
  base    = hourly[hour] if 0 <= hour < 24 else 0

  mod = find_modifier(place_name)
  if mod:
    open_from  = mod.get("open_from", 0)
    open_until = mod.get("open_until", 24)
    closed_day = mod.get("closed_day", -1)
    if day == closed_day: return 0
    if hour < open_from or hour >= open_until: return 0
    mult = mod.get("mult", 1.0)
    if day in mod.get("peak_days",[]) and hour in mod.get("peak_hours",range(0)):
      mult *= 1.25
    score = int(base * mult)
  else:
    score = base

  # Add unique per-place variation
  variation = place_variation(place_name, category)
  score = score + int(score * variation / 100)

  return max(0, min(100, score))

def to_level(s): return "Low" if s < 35 else "Medium" if s < 65 else "High"

def to_people(s, cat):
  caps={"mall":500,"restaurant":80,"cafe":40,"gym":60,"park":300,"zoo":400,
        "cinema":150,"tourist":200,"bus_stand":400,"airport":800,"market":600}
  return int((s/100)*caps.get(cat,100))

def to_wait(s):
  if s==0:   return "Closed"
  if s<20:   return "No wait"
  if s<35:   return "< 5 min"
  if s<55:   return "5-15 min"
  if s<75:   return "15-30 min"
  return "30+ min"

def best_time(cat, day, name=""):
  mod = find_modifier(name)
  open_from  = mod.get("open_from",6) if mod else 6
  open_until = mod.get("open_until",22) if mod else 22
  closed_day = mod.get("closed_day",-1) if mod else -1
  if day == closed_day:
    days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    return f"Closed today — visit {days[(day+1)%7]}"
  open_h = [(h, get_score(cat,h,day,name)) for h in range(open_from, open_until)]
  low = [h for h,s in open_h if 0 < s < 35]
  if not low:
    mi = min(open_h, key=lambda x:x[1])[0]
    return f"{mi:02d}:00"
  return f"{low[0]:02d}:00 – {low[0]+1:02d}:00"

def get_trend(cat, h, day, name=""):
  cur=get_score(cat,h,day,name)
  nxt=get_score(cat,h+1 if h<23 else h,day,name)
  d=nxt-cur
  if d>8:  return "↑ Getting busier"
  if d<-8: return "↓ Getting quieter"
  return "→ Staying same"

def get_cost(cat, name=""):
  n=name.lower()
  for k,v in PLACE_COSTS.items():
    if k in n: return v
  return COSTS.get(cat,"₹100 – ₹500")

def open_status(name, h, day):
  mod=find_modifier(name)
  if not mod: return "Open"
  cd=mod.get("closed_day",-1); of=mod.get("open_from",0); ou=mod.get("open_until",24)
  if day==cd: return "Closed today"
  if h<of: return f"Opens at {of:02d}:00"
  if h>=ou: return f"Closed (opens {of:02d}:00)"
  return f"Open until {ou:02d}:00"

class PredictRequest(BaseModel):
  place_id:    str
  category:    Optional[str] = "mall"
  place_name:  Optional[str] = ""
  target_hour: Optional[int] = None
  target_day:  Optional[int] = None

class PredictResponse(BaseModel):
  crowd_level:    str
  crowd_score:    int
  active_users:   int
  waiting_time:   str
  estimated_cost: str
  best_time:      str
  trend:          str
  open_status:    str
  confidence:     str

@app.get("/")
def root(): return {"message":"VisitWise AI v5","categories":list(BASE_PATTERNS.keys())}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
  now  = datetime.now()
  h    = req.target_hour if req.target_hour is not None else now.hour
  d    = req.target_day  if req.target_day  is not None else now.weekday()
  cat  = (req.category or "mall").lower()
  name = (req.place_name or "").strip()

  # Map category aliases
  if cat in ["bus stand","bus_stand","bus terminal","bus"]: cat="bus_stand"
  if cat in ["airport","airports"]: cat="airport"
  if cat in ["market","markets","bazaar"]: cat="market"

  s = get_score(cat, h, d, name)

  return PredictResponse(
    crowd_level    = to_level(s),
    crowd_score    = s,
    active_users   = to_people(s, cat),
    waiting_time   = to_wait(s),
    estimated_cost = get_cost(cat, name),
    best_time      = best_time(cat, d, name),
    trend          = get_trend(cat, h, d, name),
    open_status    = open_status(name, h, d),
    confidence     = "high" if find_modifier(name) else "medium",
  )

# ── Compare endpoint — which place has less crowd ─────────
@app.post("/compare")
def compare(req: dict):
  """Compare multiple places, return ranked by least crowd"""
  places = req.get("places", [])
  now    = datetime.now()
  h      = req.get("hour", now.hour)
  d      = req.get("day",  now.weekday())

  results = []
  for p in places:
    name = p.get("name","")
    cat  = p.get("category","mall")
    s    = get_score(cat, h, d, name)
    results.append({
      "name":        name,
      "category":    cat,
      "crowd_score": s,
      "crowd_level": to_level(s),
      "waiting_time":to_wait(s),
      "best_time":   best_time(cat,d,name),
    })

  results.sort(key=lambda x: x["crowd_score"])
  return {"ranked": results, "recommendation": results[0] if results else None}

@app.get("/health")
def health(): return {"status":"ok","time":datetime.now().isoformat()}
