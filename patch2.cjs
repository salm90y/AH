const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const targetToRemove = `          {/* External Controls Box */}
          {videoId && (
            <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-xl z-20">
              <div className="flex items-center gap-3 w-full" dir="ltr">
                <span className="text-xs font-mono text-gray-400 w-10 text-right">{formatTime(playedSeconds)}</span>
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  value={playedSeconds || 0}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                />
                <span className="text-xs font-mono text-gray-400 w-10">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center justify-between" dir="ltr">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlayPause} className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors shadow-lg shadow-red-600/20">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => setVolume(v => v > 0 ? 0 : 1)} className="text-gray-300 hover:text-white transition-colors">
                      {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step={0.01}
                      value={volume ?? 1}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-24 h-1.5 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>`;

const newControls = `
          {/* External Controls Box - Placed inside so it shows in fullscreen */}
          {videoId && (
            <div className={\`w-full bg-white/5 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-4 z-20 \${isFullscreen ? 'absolute bottom-0 left-0 right-0 border-t border-b-0 border-l-0 border-r-0 rounded-none bg-black/80' : 'rounded-2xl shadow-xl mt-[-10px]'}\`}>
              <div className="flex items-center gap-3 w-full" dir="ltr">
                <span className="text-xs font-mono text-gray-400 w-10 text-right">{formatTime(playedSeconds)}</span>
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  value={playedSeconds || 0}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  onTouchStart={handleSeekMouseDown}
                  onTouchEnd={handleSeekMouseUp}
                  className="flex-1 h-2 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                />
                <span className="text-xs font-mono text-gray-400 w-10">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center justify-between" dir="ltr">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlayPause} className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors shadow-lg shadow-red-600/20">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => setVolume(v => v > 0 ? 0 : 1)} className="text-gray-300 hover:text-white transition-colors">
                      {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step={0.01}
                      value={volume ?? 1}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-24 h-1.5 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                    />
                  </div>
                </div>
                
                <button onClick={toggleFullscreen} className="text-gray-300 hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>`;

code = code.replace(targetToRemove, newControls);
fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log(code.includes('handleSeekMouseDown') ? 'Success' : 'Failed');
