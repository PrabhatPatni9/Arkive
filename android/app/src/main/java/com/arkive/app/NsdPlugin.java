package com.arkive.app;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native Android mDNS plugin for Arkive LAN discovery.
 *
 * Registers this device as _arkive._tcp on the local network and
 * discovers other Arkive devices on the same LAN (AP-isolation permitting).
 *
 * Fires 'serviceFound' and 'serviceLost' events to JS with {name, host, port}.
 * The service name encodes the device_id so peers can initiate WebRTC signaling.
 */
@CapacitorPlugin(name = "ArkiveNsd")
public class NsdPlugin extends Plugin {

    private static final String SERVICE_TYPE = "_arkive._tcp.";
    private static final String TAG = "ArkiveNsd";

    private NsdManager nsdManager;
    private NsdManager.RegistrationListener registrationListener;
    private NsdManager.DiscoveryListener discoveryListener;
    private String registeredServiceName;

    @PluginMethod
    public void register(PluginCall call) {
        String deviceId = call.getString("deviceId");
        int port = call.getInt("port", 47823);

        if (deviceId == null || deviceId.isEmpty()) {
            call.reject("deviceId is required");
            return;
        }

        nsdManager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);

        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        // NSD service name max 63 chars; truncate deviceId if needed
        serviceInfo.setServiceName("arkive-" + deviceId.substring(0, Math.min(deviceId.length(), 44)));
        serviceInfo.setServiceType(SERVICE_TYPE);
        serviceInfo.setPort(port);

        registrationListener = new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo info) {
                registeredServiceName = info.getServiceName();
                call.resolve();
            }
            @Override
            public void onRegistrationFailed(NsdServiceInfo info, int errorCode) {
                call.reject("Registration failed: " + errorCode);
            }
            @Override public void onServiceUnregistered(NsdServiceInfo info) {}
            @Override public void onUnregistrationFailed(NsdServiceInfo info, int errorCode) {}
        };

        try {
            nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener);
        } catch (Exception e) {
            call.reject("NSD register error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (nsdManager == null) {
            nsdManager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        }

        discoveryListener = new NsdManager.DiscoveryListener() {
            @Override
            public void onDiscoveryStarted(String serviceType) {
                call.resolve();
            }
            @Override
            public void onServiceFound(NsdServiceInfo serviceInfo) {
                if (!serviceInfo.getServiceType().equals(SERVICE_TYPE)) return;
                if (serviceInfo.getServiceName().equals(registeredServiceName)) return;

                nsdManager.resolveService(serviceInfo, new NsdManager.ResolveListener() {
                    @Override
                    public void onResolved(NsdServiceInfo resolvedInfo) {
                        String name = resolvedInfo.getServiceName();
                        // Extract device_id: strip "arkive-" prefix
                        String deviceId = name.startsWith("arkive-") ? name.substring(7) : name;
                        String host = resolvedInfo.getHost() != null
                            ? resolvedInfo.getHost().getHostAddress()
                            : "";
                        int port = resolvedInfo.getPort();

                        JSObject peer = new JSObject();
                        peer.put("name", deviceId);
                        peer.put("host", host);
                        peer.put("port", port);
                        notifyListeners("serviceFound", peer);
                    }
                    @Override
                    public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {}
                });
            }
            @Override
            public void onServiceLost(NsdServiceInfo serviceInfo) {
                String name = serviceInfo.getServiceName();
                String deviceId = name.startsWith("arkive-") ? name.substring(7) : name;
                JSObject peer = new JSObject();
                peer.put("name", deviceId);
                notifyListeners("serviceLost", peer);
            }
            @Override
            public void onDiscoveryStopped(String serviceType) {}
            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                call.reject("Discovery start failed: " + errorCode);
            }
            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {}
        };

        try {
            nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
        } catch (Exception e) {
            call.reject("NSD discovery error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            if (discoveryListener != null && nsdManager != null) {
                nsdManager.stopServiceDiscovery(discoveryListener);
                discoveryListener = null;
            }
        } catch (Exception ignored) {}

        try {
            if (registrationListener != null && nsdManager != null) {
                nsdManager.unregisterService(registrationListener);
                registrationListener = null;
            }
        } catch (Exception ignored) {}

        call.resolve();
    }
}
