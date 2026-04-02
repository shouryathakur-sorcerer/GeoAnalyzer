import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

export default function MapCore({ onCountryClick, trackedCountries = [], selectedCountry }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const canvasRef = useRef();
  
  // We use a ref for the click handler so we don't have to put it in the useEffect dependencies.
  // This prevents React from rebuilding the map every time the parent re-renders.
  const clickHandlerRef = useRef(onCountryClick);
  useEffect(() => {
    clickHandlerRef.current = onCountryClick;
  }, [onCountryClick]);

  const trackedCountriesRef = useRef(trackedCountries);
  const selectedCountryRef = useRef(selectedCountry);

  useEffect(() => {
    trackedCountriesRef.current = trackedCountries;
  }, [trackedCountries]);

  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
  }, [selectedCountry]);

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    
    const svg = d3.select(svgRef.current).attr('width', W).attr('height', H);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    svg.selectAll('*').remove(); 

    const g = svg.append('g');
    const projection = d3.geoMercator().scale(W / 6.5).translate([W / 2, H / 1.5]);
    const path = d3.geoPath().projection(projection);

    let zoomTransform = { k: 1, x: 0, y: 0 };
    let countryNodes = {};

    svg.call(d3.zoom().scaleExtent([1, 8]).on('zoom', (e) => {
      g.attr('transform', e.transform);
      zoomTransform = e.transform;
    }));

    // Draw Map
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
      const countries = topojson.feature(world, world.objects.countries).features;
      
      g.selectAll("path")
        .data(countries)
        .enter().append("path")
        .attr("d", path)
        .style("fill", "var(--land-color)")
        .style("stroke", "var(--land-stroke)")
        .style("stroke-width", "0.5px")
        .style("cursor", "pointer")
        .on("mouseover", function() {
          d3.select(this).style("fill", "var(--land-hover)").style("stroke", "var(--accent-blue)").style("stroke-width", "1.5px");
        })
        .on("mouseout", function() {
          d3.select(this).style("fill", "var(--land-color)").style("stroke", "var(--land-stroke)").style("stroke-width", "0.5px");
        })
        .on("click", (event, d) => {
          if (clickHandlerRef.current) clickHandlerRef.current(d.properties.name);
        });

      countries.forEach(d => {
        const center = path.centroid(d);
        if (!isNaN(center[0])) countryNodes[d.properties.name] = { x: center[0], y: center[1] };
      });
    });

    // --- EXACT ANIMATION ENGINE FROM YOUR HTML ---
    let animationFrameId;
    const quakes = [];
    const flights = Array.from({length: 120}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4
    }));
    const projectiles = [];
    const activePairs = [
      ['Russia', 'Ukraine'], ['Israel', 'Iran'], ['China', 'Taiwan'], 
      ['North Korea', 'South Korea'], ['United States of America', 'China']
    ];

    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson')
      .then(r => r.json())
      .then(data => {
        data.features.forEach(f => {
          const coords = projection([f.geometry.coordinates[0], f.geometry.coordinates[1]]);
          if (coords) quakes.push({ x: coords[0], y: coords[1], mag: f.properties.mag, r: 0, maxR: f.properties.mag * 12 });
        });
      });

    const spawner = setInterval(() => {
      if (Object.keys(countryNodes).length === 0 || document.hidden) return;
      const pair = activePairs[Math.floor(Math.random() * activePairs.length)];
      const from = countryNodes[pair[Math.random()>0.5?0:1]];
      const to = countryNodes[pair[Math.random()>0.5?0:1]];
        
      if (from && to) {
        projectiles.push({
          startX: from.x, startY: from.y, endX: to.x, endY: to.y,
          x: from.x, y: from.y, progress: 0, speed: 0.006 
        });
      }
    }, 1200);

    let radarAngle = 0;
    let cloudOffset = 0;

    function drawMapOverlays() {
      ctx.clearRect(0, 0, W, H);
        
      ctx.save();
      ctx.translate(zoomTransform.x, zoomTransform.y);
      ctx.scale(zoomTransform.k, zoomTransform.k);

      // Shadows
      const now = new Date();
      const utcHour = now.getUTCHours() + now.getUTCMinutes()/60;
      const sunLon = 180 - (utcHour * 15); 
      const shadowX = projection([sunLon > 0 ? sunLon - 180 : sunLon + 180, 0])[0];
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)'; 
      ctx.fillRect(shadowX, -H, W, H*3); 

      // Clouds
      cloudOffset += 0.15;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
      for(let i=0; i<80; i++) {
        let cx = (Math.sin(i*123) * W + cloudOffset) % W;
        let cy = Math.cos(i*321) * H;
        ctx.beginPath(); ctx.arc(cx, cy, 20 + (i%15), 0, Math.PI*2); ctx.fill();
      }

      // Quakes
      ctx.lineWidth = 1;
      quakes.forEach(q => {
        q.r += 0.15; if(q.r > q.maxR) q.r = 0;
        ctx.strokeStyle = `rgba(239, 68, 68, ${1 - q.r/q.maxR})`; 
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI*2); ctx.stroke();
      });

      // Flights
      ctx.fillStyle = '#64748b'; 
      flights.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        if(f.x<0) f.x=W; if(f.x>W) f.x=0; if(f.y<0) f.y=H; if(f.y>H) f.y=0;
        ctx.beginPath(); ctx.arc(f.x, f.y, 1.2, 0, Math.PI*2); ctx.fill();
      });

      // Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.progress += p.speed;
            
        if (p.progress >= 1) {
          projectiles.splice(i, 1);
          continue;
        }

        const dist = Math.hypot(p.endX - p.startX, p.endY - p.startY);
        const cpX = (p.startX + p.endX)/2;
        const cpY = (p.startY + p.endY)/2 - dist * 0.3;
                
        const t = p.progress;
        p.x = (1-t)*(1-t)*p.startX + 2*(1-t)*t*cpX + t*t*p.endX;
        p.y = (1-t)*(1-t)*p.startY + 2*(1-t)*t*cpY + t*t*p.endY;

        ctx.fillStyle = '#f59e0b'; 
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
                
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.startX, p.startY); ctx.quadraticCurveTo(cpX, cpY, p.x, p.y); ctx.stroke();
      }

      trackedCountriesRef.current.forEach((countryIntel) => {
        const node = countryNodes[countryIntel.country];
        if (!node) {
          return;
        }

        const severity = countryIntel.defcon ? (6 - countryIntel.defcon) / 5 : 0.15;
        const radius = 10 + severity * 18;
        const isSelected = selectedCountryRef.current === countryIntel.country;

        ctx.strokeStyle = isSelected ? 'rgba(59, 130, 246, 0.95)' : `rgba(239, 68, 68, ${0.35 + severity * 0.45})`;
        ctx.lineWidth = isSelected ? 2.8 : 1.4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (Math.sin(Date.now() / 240) + 1) * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#3b82f6' : '#ef4444';
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Radar Sweep
      radarAngle += 0.015;
      const cx = W/2, cy = H/2;
      const gradient = ctx.createConicGradient(radarAngle, cx, cy);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
      gradient.addColorStop(0.1, 'rgba(59, 130, 246, 0)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(W,H), 0, Math.PI*2); ctx.fill();
        
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); 
      ctx.lineTo(cx + Math.cos(radarAngle)*Math.max(W,H), cy + Math.sin(radarAngle)*Math.max(W,H));
      ctx.stroke();

      animationFrameId = requestAnimationFrame(drawMapOverlays);
    }

    drawMapOverlays();

    // Clean up purely on component unmount
    return () => {
      clearInterval(spawner);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // <--- THIS EMPTY ARRAY IS CRITICAL. It stops the refreshing.

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: 'var(--ocean-color)' }}>
      <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }} />
    </div>
  );
}
