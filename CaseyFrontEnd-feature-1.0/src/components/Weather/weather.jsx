// Weather.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import WeatherIcon from "react-weathericons";
import "weathericons/css/weather-icons.css";
import "./weather.scss";

const iconMap = {
    "01d": "day-sunny",
    "01n": "night-clear",
    "02d": "day-cloudy",
    "02n": "night-alt-cloudy",
    "03d": "cloud",
    "03n": "cloud",
    "04d": "cloudy",
    "04n": "cloudy",
    "09d": "showers",
    "09n": "showers",
    "10d": "rain",
    "10n": "rain",
    "11d": "thunderstorm",
    "11n": "thunderstorm",
    "13d": "snow",
    "13n": "snow",
    "50d": "fog",
    "50n": "fog",
};

const WeatherWidget = ({ apiKey, defaultCity = "Des Moines" }) => {
    const [cityInput, setCityInput] = useState(defaultCity);
    const [city, setCity] = useState(defaultCity);
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [dailyForecast, setDailyForecast] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Fetch weather data
    const fetchWeather = async () => {
        if (!city || !apiKey) return;

        setLoading(true);
        setError(null);

        try {
            const [currentResponse, forecastResponse] = await Promise.all([
                axios.get(
                    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`
                ),
                axios.get(
                    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`
                ),
            ]);

            setWeather(currentResponse.data);

            // Process hourly forecast (next 5 hours)
            const hourlyForecast = forecastResponse.data.list.slice(0, 5);
            setForecast(hourlyForecast);

            // Process daily forecast (one entry per day for 5 days)
            const dailyData = forecastResponse.data.list.reduce((acc, entry) => {
                const date = new Date(entry.dt * 1000).toLocaleDateString();
                if (!acc[date]) {
                    acc[date] = {
                        dt: entry.dt,
                        temp_max: entry.main.temp_max,
                        temp_min: entry.main.temp_min,
                        weather: entry.weather[0],
                    };
                } else {
                    acc[date].temp_max = Math.max(acc[date].temp_max, entry.main.temp_max);
                    acc[date].temp_min = Math.min(acc[date].temp_min, entry.main.temp_min);
                }
                return acc;
            }, {});

            const dailyArray = Object.values(dailyData).slice(0, 5);
            setDailyForecast(dailyArray);
        } catch (err) {
            if (err.response?.status === 404) {
                setError("City not found.");
            } else {
                setError("Failed to fetch weather.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Update weather data on city change
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (cityInput) setCity(cityInput);
        }, 500);
        return () => clearTimeout(timeout);
    }, [cityInput]);

    // Fetch weather data initially and set up periodic refresh
    useEffect(() => {
        fetchWeather();

        // Refresh weather data every 10 minutes (600,000 ms)
        const weatherInterval = setInterval(() => {
            fetchWeather();
        }, 600000);

        return () => clearInterval(weatherInterval);
    }, [city, apiKey]);

    // Update current time every minute
    useEffect(() => {
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timeInterval);
    }, []);

    const getCurrentTime = () => {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
    };

    const getDayName = (dt) => {
        const date = new Date(dt * 1000);
        return date.toLocaleDateString("en-US", { weekday: "short" });
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
    };

    const getWindDirection = (deg) => {
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const index = Math.round(deg / 45) % 8;
        return directions[index];
    };

    const currentIcon = weather ? iconMap[weather.weather[0].icon] || "day-sunny" : "day-sunny";

    return (
        <div className="weather-widget compact">
            <div className="widget-glass">
                <input
                    className="city-input"
                    type="text"
                    placeholder="Enter city name..."
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    disabled={loading}
                />
                {error && <p className="error">{error}</p>}
                {loading && <p className="loading">Loading...</p>}
                {weather && (
                    <>
                        <div className="weather-header">
                            <h3>
                                {weather.name}, {weather.sys.country}
                            </h3>
                            <p className="current-time">{getCurrentTime()}</p>
                        </div>

                        <div className="current-weather">
                            <div className="main-info">
                                <WeatherIcon name={currentIcon} size="3x" />
                                <div>
                                    <h2>{Math.round(weather.main.temp)}°F</h2>
                                    <p className="desc">{weather.weather[0].description}</p>
                                    <p className="feels-like">
                                        Feels like {Math.round(weather.main.feels_like)}°F
                                    </p>
                                </div>
                            </div>

                            <div className="detailed-info">
                                <div className="info-item">
                                    <WeatherIcon name="humidity" size="lg" />
                                    <span>{weather.main.humidity}%</span>
                                    <p>Humidity</p>
                                </div>
                                <div className="info-item">
                                    <WeatherIcon name="strong-wind" size="lg" />
                                    <span>
                                        {weather.wind.speed} mph {getWindDirection(weather.wind.deg)}
                                    </span>
                                    <p>Wind</p>
                                </div>
                                <div className="info-item">
                                    <WeatherIcon name="barometer" size="lg" />
                                    <span>{weather.main.pressure} hPa</span>
                                    <p>Pressure</p>
                                </div>
                                <div className="info-item">
                                    <WeatherIcon name="horizon" size="lg" />
                                    <span>{Math.round(weather.visibility / 1609)} mi</span>
                                    <p>Visibility</p>
                                </div>
                                <div className="info-item">
                                    <WeatherIcon name="sunrise" size="lg" />
                                    <span>{formatTime(weather.sys.sunrise)}</span>
                                    <p>Sunrise</p>
                                </div>
                                <div className="info-item">
                                    <WeatherIcon name="sunset" size="lg" />
                                    <span>{formatTime(weather.sys.sunset)}</span>
                                    <p>Sunset</p>
                                </div>
                            </div>
                        </div>

                        {/* <div className="hourly-forecast">
                            <h4>Next 5 Hours</h4>
                            <div className="hourly-items">
                                {forecast &&
                                    forecast.map((hour, index) => {
                                        const icon = iconMap[hour.weather[0].icon] || "day-sunny";
                                        const hourLabel = index === 0 ? "Now" : new Date(hour.dt * 1000).getHours();
                                        return (
                                            <div key={index} className="hourly-item">
                                                <p className="hour">{hourLabel}</p>
                                                <WeatherIcon name={icon} size="lg" />
                                                <p className="temp">{Math.round(hour.main.temp)}°</p>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                        <div className="daily-forecast">
                            <h4>Next 5 Days</h4>
                            <div className="daily-items">
                                {dailyForecast &&
                                    dailyForecast.map((day, index) => {
                                        const icon = iconMap[day.weather.icon] || "day-sunny";
                                        return (
                                            <div key={index} className="daily-item">
                                                <p className="day">{getDayName(day.dt)}</p>
                                                <WeatherIcon name={icon} size="lg" />
                                                <p className="temp">
                                                    {Math.round(day.temp_max)}°/{Math.round(day.temp_min)}°
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div> */}
                    </>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;