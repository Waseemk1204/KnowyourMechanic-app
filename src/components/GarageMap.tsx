import { useEffect, useRef } from 'react';

interface GarageMapProps {
    garages: { id: string; name: string; lat: number; lng: number }[];
    userLocation: { lat: number; lng: number };
    onGarageSelect?: (garage: { id: string; name: string; lat: number; lng: number }) => void;
}

export default function GarageMap({ garages, userLocation, onGarageSelect }: GarageMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Simple SVG-based map representation
        if (mapRef.current) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', '0 0 400 200');
            svg.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';

            // Grid lines
            for (let i = 0; i <= 8; i++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', String(i * 50));
                line.setAttribute('y1', '0');
                line.setAttribute('x2', String(i * 50));
                line.setAttribute('y2', '200');
                line.setAttribute('stroke', 'rgba(100, 116, 139, 0.1)');
                svg.appendChild(line);
            }
            for (let i = 0; i <= 4; i++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', '0');
                line.setAttribute('y1', String(i * 50));
                line.setAttribute('x2', '400');
                line.setAttribute('y2', String(i * 50));
                line.setAttribute('stroke', 'rgba(100, 116, 139, 0.1)');
                svg.appendChild(line);
            }

            // User location
            const userDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            userDot.setAttribute('cx', '200');
            userDot.setAttribute('cy', '100');
            userDot.setAttribute('r', '8');
            userDot.setAttribute('fill', '#3b82f6');
            userDot.setAttribute('stroke', 'white');
            userDot.setAttribute('stroke-width', '2');
            svg.appendChild(userDot);

            // Garage markers
            garages.forEach((garage, index) => {
                const angle = (index / garages.length) * 2 * Math.PI;
                const distance = 50 + Math.random() * 30;
                const x = 200 + Math.cos(angle) * distance;
                const y = 100 + Math.sin(angle) * distance;

                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                marker.setAttribute('cx', String(x));
                marker.setAttribute('cy', String(y));
                marker.setAttribute('r', '10');
                marker.setAttribute('fill', '#8b5cf6');
                marker.setAttribute('stroke', 'white');
                marker.setAttribute('stroke-width', '2');
                marker.style.cursor = 'pointer';
                marker.addEventListener('click', () => onGarageSelect?.(garage));
                svg.appendChild(marker);
            });

            mapRef.current.innerHTML = '';
            mapRef.current.appendChild(svg);
        }
    }, [garages, userLocation, onGarageSelect]);

    return <div ref={mapRef} className="w-full h-full" />;
}
