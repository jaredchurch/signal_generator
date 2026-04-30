# Scratchpad Notes

## Synth Pads - NEEDS WORK
The current synth pad implementation sounds harsh. Need to research ambient pad synthesis.

### Ideas for improvement:
- Try different waveform combinations (e.g., sine + triangle mix)
- Add reverb/delay effects
- Try different chord voicings
- Consider using multiple oscillators with different waveforms
- Lower frequencies need more filtering
- May need ADSR envelope for softer attack/release

## Tuner - Working
- Pitch detection using autocorrelation
- Displays cents deviation
- Spectrum analyser shows target note

## Metronome - Working
- Tempo control 40-240 BPM
- Pendulum visualization
- LED VU meter

## Already merged (PR #14):
- Tuner page
- Metronome page
- .gitignore