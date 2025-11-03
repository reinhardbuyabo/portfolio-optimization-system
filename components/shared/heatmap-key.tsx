import React from 'react';

const HeatmapKey = () => {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-[#d7191c]"></div>
        <span>-10%</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-[#ffffbf]"></div>
        <span>0%</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-[#1a9641]"></div>
        <span>+10%</span>
      </div>
    </div>
  );
};

export default HeatmapKey;
