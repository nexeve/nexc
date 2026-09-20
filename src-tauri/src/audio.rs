use libpulse_binding::sample::{Format, Spec};
use libpulse_binding::stream::Direction;
use libpulse_binding::def::BufferAttr;
use libpulse_simple_binding::Simple;
use rustfft::{FftPlanner, num_complex::Complex};
use std::thread;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

pub static AUDIO_ACTIVE: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn set_audio_active(active: bool) {
    AUDIO_ACTIVE.store(active, Ordering::Relaxed);
}

#[derive(Clone, serde::Serialize)]
pub struct AudioSpectrum {
    pub bands: Vec<f32>,
}

pub fn spawn_audio_capture(app_handle: AppHandle) {
    thread::spawn(move || {
        let spec = Spec {
            format: Format::S16le,
            channels: 1, 
            rate: 44100,
        };

        // Explicitly request a small fragment size to minimize PulseAudio server-side buffering latency.
        // 1024 samples * 2 bytes/sample = 2048 bytes
        let buffer_attr = BufferAttr {
            maxlength: std::u32::MAX,
            tlength: std::u32::MAX,
            prebuf: std::u32::MAX,
            minreq: std::u32::MAX,
            fragsize: 2048, 
        };

        let s = match Simple::new(
            None,
            "NexClock",
            Direction::Record,
            Some("@DEFAULT_MONITOR@"),
            "Audio Analysis",
            &spec,
            None,
            Some(&buffer_attr),
        ) {
            Ok(s) => s,
            Err(_) => return, // Fail gracefully
        };

        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(1024);
        let mut buffer = vec![0i16; 1024];

        let window = (0..1024).map(|i| 0.5 * (1.0 - (2.0 * std::f32::consts::PI * (i as f32) / 1023.0).cos())).collect::<Vec<f32>>();
        let num_bands = 64;

        loop {
            let byte_slice = unsafe {
                std::slice::from_raw_parts_mut(
                    buffer.as_mut_ptr() as *mut u8,
                    buffer.len() * 2, 
                )
            };

            // Read blocks until `fragsize` bytes are available. With 2048 bytes, it waits ~23ms.
            if s.read(byte_slice).is_err() {
                break;
            }

            if !AUDIO_ACTIVE.load(Ordering::Relaxed) {
                continue;
            }

            let mut complex_buffer: Vec<Complex<f32>> = buffer.iter().enumerate().map(|(i, &x)| {
                Complex::new(((x as f32) / 32768.0) * window[i], 0.0)
            }).collect();

            fft.process(&mut complex_buffer);
            
            let mut bands = vec![0.0; num_bands];
            
            let min_log = 1.0f32.ln(); // ~43 Hz
            let max_log = 511.0f32.ln(); // ~22 kHz
            let log_range = max_log - min_log;

            for i in 1..=511 {
                let bin_log = (i as f32).ln();
                let normalized = (bin_log - min_log) / log_range;
                let mut band_idx = (normalized * (num_bands as f32)).floor() as usize;
                if band_idx >= num_bands {
                    band_idx = num_bands - 1;
                }
                
                let mag = complex_buffer[i].norm();
                
                // Scale magnitude for visualizer. 
                // A full scale sine wave peak is ~256. Real music spreads energy, peak bins are often 20-80.
                // Using sqrt compresses dynamic range nicely so quiet sounds are visible but loud sounds aren't perpetually clipped.
                let scaled = (mag / 40.0).sqrt().min(1.0);

                if scaled > bands[band_idx] {
                    bands[band_idx] = scaled; 
                }
            }

            let payload = AudioSpectrum { bands };
            let _ = app_handle.emit("audio-spectrum", payload);
        }
    });
}
