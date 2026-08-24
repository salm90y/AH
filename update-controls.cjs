const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const targetStart = `                {/* Custom Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">`;

const oldControls = `                {/* Custom Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs font-mono">{formatTime(playedSeconds)}</span>
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      value={playedSeconds || 0}
                      onChange={handleSeek}
                      className="flex-1 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                    />
                    <span className="text-xs font-mono">{formatTime(duration)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={togglePlayPause} className="text-white hover:text-red-500 transition-colors">
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                      </button>
                      
                      <div className="flex items-center gap-2 group/volume relative">
                        <button onClick={() => setVolume(v => v > 0 ? 0 : 1)} className="text-white hover:text-white/80 transition-colors">
                          {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input 
                          type="range" 
                          min={0} 
                          max={1} 
                          step={0.01}
                          value={volume ?? 1}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-20 md:w-24 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>`;

const endTarget = `            )}
          </div>
        </div>`;

const replacement = `              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-500 gap-4 relative z-10 p-8">
                <Youtube className="w-16 h-16 opacity-50" />
                <p className="text-lg font-medium">في انتظار اختيار فيديو للمشاهدة...</p>
              </div>
            )}
          </div>
          
          {/* External Controls Box */}
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

// Combine the logic
let toReplace = oldControls + `
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-500 gap-4 relative z-10 p-8">
                <Youtube className="w-16 h-16 opacity-50" />
                <p className="text-lg font-medium">في انتظار اختيار فيديو للمشاهدة...</p>
              </div>
            )}
          </div>
        </div>`;

if (code.includes(toReplace)) {
  console.log("Replacing whole block.");
  code = code.replace(toReplace, replacement);
  fs.writeFileSync('src/components/WatchRoom.tsx', code);
} else {
  // Try another approach
  console.log("Fallback replacement...");
  code = code.replace(oldControls, '');
  
  let injectionPoint = `              </div>
            )}
          </div>
        </div>`;
        
  let injectionReplacement = `              </div>
            )}
          </div>
          
          {/* External Controls Box */}
          {videoId && (
            <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-xl z-20 mt-[-10px]">
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
        
  if (code.includes(injectionPoint)) {
     code = code.replace(injectionPoint, injectionReplacement);
     fs.writeFileSync('src/components/WatchRoom.tsx', code);
  } else {
     console.log("Could not find string to replace.");
  }
}
