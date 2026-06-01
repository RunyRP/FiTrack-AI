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

            // Cancel all existing notifications before rescheduling (prevents piling up during dev)
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }

            const schedule: any[] = [];
            const now = new Date();

            // 1. Water Reminder (1 minute)
            schedule.push({
                id: 1,
                title: "Hydration Time 💧",
                body: "Don't forget to drink some water! Stay hydrated.",
                schedule: { at: new Date(now.getTime() + 60 * 1000) }
            });

            // 2. Steps Reminder (2 minutes)
            schedule.push({
                id: 2,
                title: "Move it! 🚶",
                body: "Time to hit your step goal. Get up and walk!",
                schedule: { at: new Date(now.getTime() + 120 * 1000) }
            });

            // 3. Kcal Reminder (3 minutes)
            schedule.push({
                id: 3,
                title: "Fuel Up 🍎",
                body: "Check your calorie intake. Make sure you're eating enough!",
                schedule: { at: new Date(now.getTime() + 180 * 1000) }
            });

            // 4. Creatine Reminder (4 minutes)
            schedule.push({
                id: 4,
                title: "Creatine Check 💊",
                body: "Did you take your creatine today? Gainz await!",
                schedule: { at: new Date(now.getTime() + 240 * 1000) }
            });

            // 5. Workout Motivation (5 minutes, only on workout days)
            try {
                const res = await api.get('/workout/schedule');
                const workoutSchedule = res.data;
                // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
                // App format: 0=Mon, 1=Tue, ..., 6=Sun
                const today = (new Date().getDay() + 6) % 7;
                
                if (workoutSchedule.gym_days && workoutSchedule.gym_days.includes(today)) {
                    const motivationalMessages = [
                        "Get off the chair! Success is waiting for you at the gym. 🔥",
                        "The only bad workout is the one that didn't happen. Let's go! 💪",
                        "Excuses don't burn calories. Move it! ⚡",
                        "Your future self will thank you. Hit the gym! 🏋️‍♂️"
                    ];
                    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
                    
                    schedule.push({
                        id: 5,
                        title: "Gym Day! 🏋️‍♂️",
                        body: randomMessage,
                        schedule: { at: new Date(now.getTime() + 300 * 1000) }
                    });
                }
            } catch (err) {
                console.error("Failed to fetch workout schedule for notifications", err);
            }

            if (schedule.length > 0) {
                await LocalNotifications.schedule({
                    notifications: schedule
                });
                console.log(`Scheduled ${schedule.length} notifications for testing.`);
            }
        } catch (err) {
            console.error("Error setting up notifications:", err);
        }
    };

    return null;
};
