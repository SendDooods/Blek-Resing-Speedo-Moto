document.addEventListener('DOMContentLoaded', () => {
    const els = {
        health: document.getElementById('health-bar'),
        fuel: document.getElementById('fuel-bar'),
        healthPercent: document.getElementById('health-percent'),
        fuelPercent: document.getElementById('fuel-percent'),
        speed: document.getElementById('speed-display'),
        gear: document.getElementById('gear-display'),
        unit: document.getElementById('speed-unit'),
        rpm: document.getElementById('rpm-boxes'),
        icons: {
            engine: document.getElementById('icon-engine'),
            fuel: document.getElementById('icon-fuel'),
            lowBeam: document.getElementById('icon-low-beam'),
            highBeam: document.getElementById('icon-high-beam'),
            left: document.getElementById('icon-left'),
            right: document.getElementById('icon-right'),
            seatbelt: document.getElementById('icon-seatbelt')
        },
        audio: {
            tick: document.getElementById('audio-tick'),
            seatbeltWarning: document.getElementById('audio-seatbelt-warning'),
            alarm: document.getElementById('audio-alarm'),
            engineWarn1: document.getElementById('audio-engine-warn1'),
            engineWarn2: document.getElementById('audio-engine-warn2'),
            fuelWarn50: document.getElementById('audio-fuel-50'),
            fuelWarn10: document.getElementById('audio-fuel-10')
        }
    };

    const vehicleState = {
        engineOn: false,
        hasMoved: false,
        isMotorcycle: true,
        engineHealth: 1.0,
        storedHealthValue: 1.0,
        storedFuelValue: 1.0,
        seatbeltBuckled: false,
        hasPlayedWarn1: false,
        hasPlayedWarn2: false,
        hasPlayedFuel50: false,
        hasPlayedFuel10: false
    };

    const manageLoopingAudio = (audioEl, shouldPlay) => {
        if (!audioEl) return;

        if (shouldPlay) {
            if (audioEl.paused) {
                audioEl.currentTime = 0;
                audioEl.play().catch(e => console.log('Audio play failed:', e));
            }
        } else {
            if (!audioEl.paused) {
                audioEl.pause();
                audioEl.currentTime = 0;
            }
        }
    };

    const playOnceAudio = (audioEl) => {
        if (!audioEl) return;
        audioEl.currentTime = 0;
        audioEl.play().catch(e => console.log('Audio play failed:', e));
    };


    const playStartupWarnings = () => {
        const healthPercentage = vehicleState.engineHealth * 100;
        const fuelPercentage = vehicleState.storedFuelValue * 100;
        
        let delay = 0;
        
        // Play engine warnings first
        if (healthPercentage <= 50 && !vehicleState.hasPlayedWarn1) {
            setTimeout(() => {
                playOnceAudio(els.audio.engineWarn1);
                vehicleState.hasPlayedWarn1 = true;
            }, delay);
            delay += 1500; // 1.5 second delay before next sound
        }
        
        if (healthPercentage <= 20 && !vehicleState.hasPlayedWarn2) {
            setTimeout(() => {
                playOnceAudio(els.audio.engineWarn2);
                vehicleState.hasPlayedWarn2 = true;
            }, delay);
            delay += 1500; // 1.5 second delay before next sound
        }
        
        // Play fuel warnings after engine warnings
        if (fuelPercentage <= 50 && !vehicleState.hasPlayedFuel50) {
            setTimeout(() => {
                playOnceAudio(els.audio.fuelWarn50);
                vehicleState.hasPlayedFuel50 = true;
            }, delay);
            delay += 1500; // 1.5 second delay before next sound
        }
        
        if (fuelPercentage <= 10 && !vehicleState.hasPlayedFuel10) {
            setTimeout(() => {
                playOnceAudio(els.audio.fuelWarn10);
                vehicleState.hasPlayedFuel10 = true;
            }, delay);
        }
    };

    const toggleIcon = (id, state) => {
        const icon = els.icons[id];
        if (!icon) return;

        const image = icon.querySelector('image');
        if (!image) return;

        if (id === 'left' || id === 'right') {
            if (state) {
                // Active: orange color, full opacity
                image.setAttribute('filter', `url(#${id}FilterActive)`);
                icon.style.opacity = '1';
                icon.classList.add('active');
            } else {
                // Inactive: always 0.3 opacity regardless of engine state
                icon.style.opacity = '0.3';
                image.setAttribute('filter', `url(#${id}FilterGrey)`);
                icon.classList.remove('active');
            }
        } else {
            // For other icons, use the old method
            icon.classList.toggle('active', !!state);
        }
    };



    // Function to refresh all icon states (call when entering vehicle)
    const refreshAllIcons = () => {
        // Update engine icon
        updateEngineIcon();

        // Update fuel icon
        const currentFuelTransform = els.fuel ? els.fuel.style.transform : '';
        const fuelMatch = currentFuelTransform.match(/translateY\((\d+)%\)/);
        if (fuelMatch) {
            const currentFuelPercentage = 100 - parseInt(fuelMatch[1]);
            updateFuelIcon(currentFuelPercentage);
        }

        // Update seatbelt icon
        window.setSeatbelts(vehicleState.seatbeltBuckled);

        // Update indicator icons
        const leftActive = els.icons.left && els.icons.left.classList.contains('active');
        const rightActive = els.icons.right && els.icons.right.classList.contains('active');
        toggleIcon('left', leftActive);
        toggleIcon('right', rightActive);

        // Update headlights (assume off if not specified)
        window.setHeadlights(0);
    };

    // Make refreshAllIcons available globally
    window.refreshAllIcons = refreshAllIcons;

    const updateEngineIcon = () => {
        const engineIcon = els.icons.engine;
        if (!engineIcon) return;
        const image = engineIcon.querySelector('image');
        if (!image) return;

        // Remove all engine-specific classes
        engineIcon.classList.remove('engine-warning', 'engine-critical');

        if (!vehicleState.engineOn) {
            // Engine off: greyed out with reduced opacity
            image.setAttribute('filter', 'url(#engineFilterGrey)');
            engineIcon.style.opacity = '0.3';
            return;
        }

        // Engine on: ALWAYS set full opacity first
        engineIcon.style.opacity = '1';

        // Then set color based on health
        const healthPercentage = vehicleState.engineHealth * 100;

        // Check for warning sounds (play once when crossing thresholds)
        // Only play if seatbelt is buckled (to avoid overlapping with seatbelt warnings)
        if (healthPercentage <= 50 && !vehicleState.hasPlayedWarn1 && vehicleState.seatbeltBuckled) {
            playOnceAudio(els.audio.engineWarn1);
            vehicleState.hasPlayedWarn1 = true;
        }

        if (healthPercentage <= 20 && !vehicleState.hasPlayedWarn2 && vehicleState.seatbeltBuckled) {
            playOnceAudio(els.audio.engineWarn2);
            vehicleState.hasPlayedWarn2 = true;
        }

        // Reset warning flags if health improves
        if (healthPercentage > 50) {
            vehicleState.hasPlayedWarn1 = false;
        }
        if (healthPercentage > 20) {
            vehicleState.hasPlayedWarn2 = false;
        }

        if (healthPercentage >= 50) {
            // Green for 50-100% health
            image.setAttribute('filter', 'url(#engineFilterGreen)');
        } else if (healthPercentage >= 25) {
            // Yellow for 25-49% health
            image.setAttribute('filter', 'url(#engineFilterYellow)');
        } else {
            // Red for 0-24% health
            image.setAttribute('filter', 'url(#engineFilterRed)');
        }
    };

    const updateFuelIcon = (fuelPercentage) => {
        const fuelIcon = els.icons.fuel;
        if (!fuelIcon) return;
        const image = fuelIcon.querySelector('image');
        if (!image) return;

        // Remove all fuel-specific classes
        fuelIcon.classList.remove('fuel-high', 'fuel-medium', 'fuel-low');

        if (!vehicleState.engineOn) {
            // Engine off: greyed out with reduced opacity
            image.setAttribute('filter', 'url(#fuelFilterGrey)');
            fuelIcon.style.opacity = '0.3';
            return;
        }

        // Engine on: full opacity and show fuel level colors using SVG filters
        fuelIcon.style.opacity = '1';

        // Check for fuel warning sounds (play once when crossing thresholds)
        // Only play if seatbelt is buckled (to avoid overlapping with seatbelt warnings)
        if (fuelPercentage <= 50 && !vehicleState.hasPlayedFuel50 && vehicleState.seatbeltBuckled) {
            playOnceAudio(els.audio.fuelWarn50);
            vehicleState.hasPlayedFuel50 = true;
        }

        if (fuelPercentage <= 10 && !vehicleState.hasPlayedFuel10 && vehicleState.seatbeltBuckled) {
            playOnceAudio(els.audio.fuelWarn10);
            vehicleState.hasPlayedFuel10 = true;
        }

        // Reset warning flags if fuel improves
        if (fuelPercentage > 50) {
            vehicleState.hasPlayedFuel50 = false;
        }
        if (fuelPercentage > 10) {
            vehicleState.hasPlayedFuel10 = false;
        }

        if (fuelPercentage >= 50) {
            // Green for 50-100%
            image.setAttribute('filter', 'url(#fuelFilterHigh)');
        } else if (fuelPercentage >= 25) {
            // Yellow for 25-49%
            image.setAttribute('filter', 'url(#fuelFilterMedium)');
        } else {
            // Red for 0-24%
            image.setAttribute('filter', 'url(#fuelFilterLow)');
            fuelIcon.classList.add('fuel-low');
        }
    };

    // Function to change speedometer background color and opacity
    window.setSpeedoBackground = (r, g, b, opacity = null) => {
        const root = document.documentElement;
        root.style.setProperty('--speedo-bg-color', `${r}, ${g}, ${b}`);
        if (opacity !== null) {
            root.style.setProperty('--speedo-bg-opacity', opacity);
        }
    };

    // Function to change only opacity
    window.setSpeedoOpacity = (opacity) => {
        const root = document.documentElement;
        root.style.setProperty('--speedo-bg-opacity', opacity);
    };

    // Functions to change bar positions within speedo-root
    window.setLeftBarPosition = (position = 'static', top = 'auto', right = 'auto', bottom = 'auto', left = 'auto', alignSelf = 'flex-start') => {
        const root = document.documentElement;
        root.style.setProperty('--left-bars-position', position);
        root.style.setProperty('--left-bars-top', top);
        root.style.setProperty('--left-bars-right', right);
        root.style.setProperty('--left-bars-bottom', bottom);
        root.style.setProperty('--left-bars-left', left);
        root.style.setProperty('--left-bars-align-self', alignSelf);
    };

    window.setRightBarPosition = (position = 'static', top = 'auto', right = 'auto', bottom = 'auto', left = 'auto', alignSelf = 'flex-start') => {
        const root = document.documentElement;
        root.style.setProperty('--right-bars-position', position);
        root.style.setProperty('--right-bars-top', top);
        root.style.setProperty('--right-bars-right', right);
        root.style.setProperty('--right-bars-bottom', bottom);
        root.style.setProperty('--right-bars-left', left);
        root.style.setProperty('--right-bars-align-self', alignSelf);
    };

    // Function to center bars within speedo-root
    window.centerBars = () => {
        setLeftBarPosition('static', 'auto', 'auto', 'auto', 'auto', 'center');
        setRightBarPosition('static', 'auto', 'auto', 'auto', 'auto', 'center');
    };

    // Function to position bars anywhere on screen
    window.setBarsPosition = (leftPos, rightPos) => {
        if (leftPos) {
            setLeftBarPosition(leftPos.position || 'fixed', leftPos.top, leftPos.right, leftPos.bottom, leftPos.left);
        }
        if (rightPos) {
            setRightBarPosition(rightPos.position || 'fixed', rightPos.top, rightPos.right, rightPos.bottom, rightPos.left);
        }
    };

    window.setVehicleType = (type) => {
        vehicleState.isMotorcycle = type === 'motorcycle';

        if (els.icons.seatbelt) {
            if (vehicleState.isMotorcycle) {
                els.icons.seatbelt.style.display = 'none';
                manageLoopingAudio(els.audio.seatbeltWarning, false); // Disable seatbelt warning for motorcycles
                manageLoopingAudio(els.audio.alarm, false); // Disable alarm for motorcycles
            } else {
                els.icons.seatbelt.style.display = '';
            }
        }
    };

    // RPM box
    if (els.rpm) {
        const box = document.createElement('div');
        box.className = 'rpm-box';
        box.textContent = '';
        els.rpm.appendChild(box);

        window.setRPM = (rpm) => {
            const rpmValue = Math.round(Math.max(0, Math.min(1, rpm)) * 8000); // Scale to 0-8000 RPM
            const rpmPercentage = Math.max(0, Math.min(100, rpm * 100)); // Convert to 0-100%
            const isActive = rpm > 0.1; // Active when RPM is above 10%
            const isRedline = rpm > 0.8; // Red when RPM is above 80% (near gear change)

            // Remove all classes first
            box.classList.remove('on', 'redline');

            if (isActive) {
                if (isRedline) {
                    box.classList.add('redline');
                } else {
                    box.classList.add('on');
                }
                box.textContent = rpmValue.toString();
            } else {
                box.textContent = '';
            }

            // Update the ::before element width
            box.style.setProperty('--fill-width', rpmPercentage + '%');
        };
    } else {
        window.setRPM = () => { };
    }

    window.setSpeed = (speed) => {
        if (!els.speed) return;
        const val = Math.round(Math.max(0, speed * 2.23694));
        els.speed.textContent = val;
        if (val > 0) vehicleState.hasMoved = true;

        // Update speed display color based on engine state and speed
        const root = document.documentElement;
        if (!vehicleState.engineOn) {
            // Engine off = white
            root.style.setProperty('--speed-color', '#ffffff');
            root.style.setProperty('--speed-glow', 'rgba(255, 255, 255, 0.8)');
        } else if (val >= 1 && val <= 40) {
            // 1-40 mph = green
            root.style.setProperty('--speed-color', '#00ff41');
            root.style.setProperty('--speed-glow', 'rgba(0, 255, 65, 0.8)');
        } else if (val >= 41 && val <= 50) {
            // 40-50 mph = yellow
            root.style.setProperty('--speed-color', '#ffff00');
            root.style.setProperty('--speed-glow', 'rgba(255, 255, 0, 0.8)');
        } else if (val > 50) {
            // Above 50 mph = red
            root.style.setProperty('--speed-color', '#ff0000');
            root.style.setProperty('--speed-glow', 'rgba(255, 0, 0, 0.8)');
        } else {
            // 0 mph with engine on = white
            root.style.setProperty('--speed-color', '#ffffff');
            root.style.setProperty('--speed-glow', 'rgba(255, 255, 255, 0.8)');
        }
    };

    window.setGear = (gear) => {
        if (!els.gear) return;

        let gearText;
        if (!vehicleState.engineOn) {
            gearText = 'N';
        } else {
            if (gear > 0) {
                gearText = gear;
            } else if (gear === 0 && vehicleState.hasMoved) {
                gearText = 'R';
            } else {
                gearText = 'N';
            }
        }

        const upperGear = String(gearText).toUpperCase();
        els.gear.textContent = upperGear;
        els.gear.classList.toggle('gear-reverse', upperGear === 'R');
    };

    window.setFuel = (val) => {
        if (!els.fuel) return;
        const p = Math.max(0, Math.min(1, val));
        const percentage = p * 100;

        // Store the actual fuel value
        vehicleState.storedFuelValue = p;

        // Update bar height
        els.fuel.style.transform = `translateY(${100 - percentage}%)`;

        // Update colors based on fuel percentage and engine state
        const root = document.documentElement;

        if (!vehicleState.engineOn) {
            // Engine off = transparent
            root.style.setProperty('--fuel-color', 'transparent');
            root.style.setProperty('--fuel-glow', 'rgba(0, 0, 0, 0)');
        } else if (percentage >= 50) {
            // Green for 50-100%
            root.style.setProperty('--fuel-color', '#00ff00');
            root.style.setProperty('--fuel-glow', 'rgba(0, 255, 0, 0.5)');
        } else if (percentage >= 25) {
            // Yellow for 25-49%
            root.style.setProperty('--fuel-color', '#ffff00');
            root.style.setProperty('--fuel-glow', 'rgba(255, 255, 0, 0.5)');
        } else {
            // Red for 0-24%
            root.style.setProperty('--fuel-color', '#ff0000');
            root.style.setProperty('--fuel-glow', 'rgba(255, 0, 0, 0.5)');
        }

        // Update fuel icon based on fuel level and engine state
        updateFuelIcon(percentage);
    };

    window.setHealth = (val) => {
        if (!els.health) return;
        const p = Math.max(0, Math.min(1, val));
        const percentage = p * 100;

        // Store the actual health value
        vehicleState.storedHealthValue = p;
        // Update engine health for icon effects
        vehicleState.engineHealth = p;

        // Update bar height
        els.health.style.transform = `translateY(${100 - percentage}%)`;

        // Update colors based on health percentage and engine state
        const root = document.documentElement;

        if (!vehicleState.engineOn) {
            // Engine off = transparent
            root.style.setProperty('--health-color', 'transparent');
            root.style.setProperty('--health-glow', 'rgba(0, 0, 0, 0)');
        } else if (percentage >= 50) {
            // Green for 50-100%
            root.style.setProperty('--health-color', '#00ff00');
            root.style.setProperty('--health-glow', 'rgba(0, 255, 0, 0.5)');
        } else if (percentage >= 25) {
            // Yellow for 25-49%
            root.style.setProperty('--health-color', '#ffff00');
            root.style.setProperty('--health-glow', 'rgba(255, 255, 0, 0.5)');
        } else {
            // Red for 0-24%
            root.style.setProperty('--health-color', '#ff0000');
            root.style.setProperty('--health-glow', 'rgba(255, 0, 0, 0.5)');
        }

        // Update engine icon based on health
        updateEngineIcon();
    };

    window.setSeatbelts = (isBuckled) => {
        if (vehicleState.isMotorcycle) {
            manageLoopingAudio(els.audio.seatbeltWarning, false);
            return;
        }

        const isWearingBelt = !!isBuckled;
        vehicleState.seatbeltBuckled = isWearingBelt; // Store seatbelt state
        const seatbeltIcon = els.icons.seatbelt;

        if (seatbeltIcon) {
            const image = seatbeltIcon.querySelector('image');
            if (image) {
                seatbeltIcon.classList.remove('active', 'seatbelt-warning');

                if (!vehicleState.engineOn) {
                    // Engine off: grey with reduced opacity
                    image.setAttribute('filter', 'url(#seatbeltFilterGrey)');
                    seatbeltIcon.style.opacity = '0.3';
                } else {
                    // Engine on: full opacity (force override any CSS animations)
                    seatbeltIcon.style.setProperty('opacity', '1', 'important');
                    if (isWearingBelt) {
                        // Buckled: green
                        image.setAttribute('filter', 'url(#seatbeltFilterActive)');
                    } else {
                        // Not buckled: red flashing
                        image.setAttribute('filter', 'url(#seatbeltFilterWarning)');
                        seatbeltIcon.classList.add('seatbelt-warning');
                    }
                }
            }
        }

        const shouldPlaySeatbeltWarning = !isWearingBelt && vehicleState.engineOn;
        manageLoopingAudio(els.audio.seatbeltWarning, shouldPlaySeatbeltWarning);
        manageLoopingAudio(els.audio.alarm, shouldPlaySeatbeltWarning);
    };

    window.setEngine = (on) => {
        const newState = !!on;
        if (vehicleState.engineOn === newState) return;

        vehicleState.engineOn = newState;

        if (!newState) {
            vehicleState.hasMoved = false;
            window.setGear('N');
            manageLoopingAudio(els.audio.seatbeltWarning, false);
            manageLoopingAudio(els.audio.alarm, false);

            // Update visual display only (keep stored values)
            window.setHealth(vehicleState.storedHealthValue);
            window.setFuel(vehicleState.storedFuelValue);
            window.setRPM(0);
        } else {
            window.setGear(0);

            // Reset warning flags when engine turns on so warnings can play again
            vehicleState.hasPlayedWarn1 = false;
            vehicleState.hasPlayedWarn2 = false;
            vehicleState.hasPlayedFuel50 = false;
            vehicleState.hasPlayedFuel10 = false;

            // Restore stored values when engine turns on
            window.setHealth(vehicleState.storedHealthValue);
            window.setFuel(vehicleState.storedFuelValue);

            if (vehicleState.isMotorcycle) {
                manageLoopingAudio(els.audio.seatbeltWarning, false);
                manageLoopingAudio(els.audio.alarm, false);
            } else {
                // Update seatbelt icon and check if warning should play
                window.setSeatbelts(vehicleState.seatbeltBuckled);
            }

            // Play startup warnings if seatbelt is buckled
            if (vehicleState.seatbeltBuckled) {
                playStartupWarnings();
            }
        }

        // Update engine icon
        updateEngineIcon();

        // Update indicator icons based on engine state
        const leftActive = els.icons.left && els.icons.left.classList.contains('active');
        const rightActive = els.icons.right && els.icons.right.classList.contains('active');
        toggleIcon('left', leftActive);
        toggleIcon('right', rightActive);

        // Update speed color when engine state changes
        const currentSpeed = els.speed ? parseInt(els.speed.textContent) || 0 : 0;
        window.setSpeed(currentSpeed / 2.23694);
    };

    window.setHeadlights = (level) => {
        const lowBeam = els.icons.lowBeam;
        const highBeam = els.icons.highBeam;

        if (!lowBeam || !highBeam) return;

        const lowBeamImage = lowBeam.querySelector('image');
        const highBeamImage = highBeam.querySelector('image');

        if (!lowBeamImage || !highBeamImage) return;

        lowBeam.classList.remove('active', 'hidden');
        highBeam.classList.remove('active', 'hidden');

        if (level === 1) {
            // Low beam active: full opacity
            lowBeamImage.setAttribute('filter', 'url(#lowBeamFilterActive)');
            lowBeam.style.opacity = '1';
            highBeam.style.opacity = '0';
        } else if (level === 2) {
            // High beam active: full opacity
            highBeamImage.setAttribute('filter', 'url(#highBeamFilterActive)');
            highBeam.style.opacity = '1';
            lowBeam.style.opacity = '0';
        } else {
            // Lights off: always 0.3 opacity (engine on or off)
            lowBeamImage.setAttribute('filter', 'url(#lowBeamFilterGrey)');
            highBeamImage.setAttribute('filter', 'url(#highBeamFilterGrey)');
            lowBeam.style.opacity = '0.3';
            highBeam.style.opacity = '0.3';
        }
    };

    const updateIndicators = () => {
        if (!els.icons.left || !els.icons.right) return;

        const leftActive = els.icons.left.classList.contains('active');
        const rightActive = els.icons.right.classList.contains('active');

        els.icons.left.classList.remove('is-blinking');
        els.icons.right.classList.remove('is-blinking');

        if (leftActive && rightActive) {
            els.icons.left.classList.add('is-blinking');
            els.icons.right.classList.add('is-blinking');
        } else if (leftActive) {
            els.icons.left.classList.add('is-blinking');
        } else if (rightActive) {
            els.icons.right.classList.add('is-blinking');
        }

        manageLoopingAudio(els.audio.tick, leftActive || rightActive);
    };

    window.setLeftIndicator = (on) => {
        toggleIcon('left', on);
        updateIndicators();
    };

    window.setRightIndicator = (on) => {
        toggleIcon('right', on);
        updateIndicators();
    };

    // Initialize bars with default values
    vehicleState.storedHealthValue = 1.0;
    vehicleState.storedFuelValue = 1.0;

    // Set initial bar heights (they'll be transparent since engine is off)
    if (els.health) {
        els.health.style.transform = `translateY(0%)`; // 100% height
    }
    if (els.fuel) {
        els.fuel.style.transform = `translateY(0%)`; // 100% height
    }

    window.setRPM(0);
});