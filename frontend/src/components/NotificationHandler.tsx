import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import api from '../api';
import { useAuth } from '../hooks';

export const NotificationHandler = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            setupNotifications();
        }
    }, [user]);

    const setupNotifications = async () => {
        try {
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display !== 'granted') {
                console.warn("Notification permissions not granted");
                return;
            }

            // Cancel all existing notifications before rescheduling
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }

            const notifications: any[] = [];
            
            // Notification Config
            const START_HOUR = 10;
            const START_MINUTE = 30;
            const END_HOUR = 23;
            const END_MINUTE = 30;
            const INTERVAL_HOURS = 2;

            const reminderTypes = [
                { title: "Hydration Time 💧", body: "Don't forget to drink some water! Stay hydrated." },
                { title: "Move it! 🚶", body: "Time to hit your step goal. Get up and walk!" },
                { title: "Fuel Up 🍎", body: "Check your calorie intake. Stay on track!" },
                { title: "Creatine Check 💊", body: "Did you take your creatine today? Gainz await!" },
                { title: "FitTrack Check 📈", body: "Log your latest activity to keep your streak alive!" }
            ];

            let notificationId = 100;

            // Generate slots from 10:30 to 23:30 every 2 hours
            for (let hour = START_HOUR; hour <= END_HOUR; hour += INTERVAL_HOURS) {
                // Skip if it's the last slot and past 23:30
                if (hour === END_HOUR && START_MINUTE > END_MINUTE) continue;

                const reminder = reminderTypes[Math.floor(Math.random() * reminderTypes.length)];
                
                notifications.push({
                    id: notificationId++,
                    title: reminder.title,
                    body: reminder.body,
                    schedule: {
                        on: {
                            hour: hour,
                            minute: START_MINUTE
                        },
                        repeats: true,
                        allowWhileIdle: true
                    }
                });
            }

            // Special Workout Reminder (only on workout days)
            try {
                const res = await api.get('/workout/schedule');
                const workoutSchedule = res.data;
                const gymDays = workoutSchedule.gym_days || []; // 0=Mon, ..., 6=Sun
                
                if (gymDays.length > 0) {
                    const motivationalMessages = [
                        "Get off the chair! Success is waiting for you at the gym. 🔥",
                        "The only bad workout is the one that didn't happen. Let's go! 💪",
                        "Excuses don't burn calories. Move it! ⚡",
                        "Your future self will thank you. Hit the gym! 🏋️‍♂️"
                    ];
                    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

                    // Convert app gym_days (0=Mon) to Capacitor days (1=Sun, 2=Mon... 7=Sat)
                    // App: 0(M), 1(T), 2(W), 3(T), 4(F), 5(S), 6(S)
                    // Cap: 1(S), 2(M), 3(T), 4(W), 5(T), 6(F), 7(S)
                    const capacitorGymDays = gymDays.map((d: number) => {
                        if (d === 6) return 1; // Sun
                        return d + 2; // Mon(0)->2, etc.
                    });

                    capacitorGymDays.forEach((day: number, index: number) => {
                        notifications.push({
                            id: 200 + index,
                            title: "Gym Day! 🏋️‍♂️",
                            body: randomMessage,
                            schedule: {
                                on: {
                                    weekday: day,
                                    hour: 17, // Reminder at 5:00 PM on gym days
                                    minute: 0
                                },
                                repeats: true,
                                allowWhileIdle: true
                            }
                        });
                    });
                }
            } catch (err) {
                console.error("Failed to fetch workout schedule for notifications", err);
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({
                    notifications: notifications
                });
                console.log(`Scheduled ${notifications.length} recurring notification slots.`);
            }
        } catch (err) {
            console.error("Error setting up notifications:", err);
        }
    };

    return null;
};
