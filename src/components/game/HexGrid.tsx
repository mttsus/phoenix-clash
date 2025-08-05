
import React, { useRef, useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { CastleInterior } from './CastleInterior';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const HexGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to hex coordinates
    const hexCoords = screenToHex(x, y);
    
    // Check if clicked on user's castle
    if (userPosition && hexCoords.q === userPosition.q && 
        hexCoords.r === userPosition.r && hexCoords.s === userPosition.s) {
      dispatch({ type: 'OPEN_CASTLE_INTERIOR' });
      return;
    }

    console.log('Clicked hex:', hexCoords);
  };

  const screenToHex = (x: number, y: number) => {
    const size = 30;
    const centerX = 400;
    const centerY = 300;
    
    const q = (2/3 * (x - centerX)) / size;
    const r = (-1/3 * (x - centerX) + Math.sqrt(3)/3 * (y - centerY)) / size;
    const s = -q - r;
    
    return { q: Math.round(q), r: Math.round(r), s: Math.round(s) };
  };

  // Fetch user positions
  const { data: userPositions } = useQuery({
    queryKey: ['userPositions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_positions')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000
  });

  // Fetch profiles separately
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch resource regions
  const { data: resourceRegions } = useQuery({
    queryKey: ['resourceRegions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_regions')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  const userPosition = userPositions?.find(pos => pos.user_id === user?.id);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const size = 30;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw hex grid
    for (let q = -6; q <= 6; q++) {
      for (let r = Math.max(-6, -q - 6); r <= Math.min(6, -q + 6); r++) {
        const s = -q - r;
        const { x, y } = hexToScreen(q, r, size, centerX, centerY);
        
        // Determine hex type and color
        let hexColor = '#3f3f46'; // default gray
        let hexText = '';
        
        // Check if this is a user position
        const userAtPosition = userPositions?.find(pos => pos.q === q && pos.r === r && pos.s === s);
        if (userAtPosition) {
          hexColor = userAtPosition.user_id === user?.id ? '#22c55e' : '#ef4444'; // Green for own castle, red for others
          const userProfile = profiles?.find(profile => profile.id === userAtPosition.user_id);
          hexText = userProfile?.username?.substring(0, 3) || 'U';
        }
        
        // Check if this is a resource region
        const resourceAtPosition = resourceRegions?.find(region => region.q === q && region.r === r && region.s === s);
        if (resourceAtPosition) {
          hexColor = getResourceColor(resourceAtPosition.resource_type);
          hexText = resourceAtPosition.resource_type.charAt(0).toUpperCase();
        }
        
        // Draw hex
        drawHexagon(ctx, x, y, size, hexColor);
        
        // Draw text
        if (hexText) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(hexText, x, y + 4);
        }
      }
    }
  }, [userPositions, resourceRegions, profiles, user]);

  const hexToScreen = (q: number, r: number, size: number, centerX: number, centerY: number) => {
    const x = size * (3/2 * q) + centerX;
    const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) + centerY;
    return { x, y };
  };

  const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#71717a';
    ctx.stroke();
  };

  const getResourceColor = (resourceType: string) => {
    switch (resourceType) {
      case 'wood': return '#8b5a3c';
      case 'gold': return '#fbbf24';
      case 'iron': return '#6b7280';
      case 'wheat': return '#84cc16';
      case 'stone': return '#78716c';
      default: return '#3f3f46';
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-border cursor-pointer"
        onClick={handleCanvasClick}
      />
      {state.isCastleInteriorOpen && <CastleInterior />}
    </div>
  );
};
