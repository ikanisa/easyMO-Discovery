
import React from 'react';

// Icons as SVG strings or simple components. 
// Using React.createElement since this is a .ts file and cannot contain JSX.

const createIcon = (paths: React.ReactNode[]) => (props: React.SVGProps<SVGSVGElement>) => 
  React.createElement('svg', { 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  }, ...paths);

export const ICONS = {
  Home: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", key: "home" })
  ]),
  Map: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", key: "map1" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z", key: "map2" })
  ]),
  Support: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z", key: "support" })
  ]),
  Business: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75Z", key: "business" })
  ]),
  Store: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75Z", key: "store" })
  ]),
  Chat: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.37.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z", key: "chat" })
  ]),
  Send: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5", key: "send" })
  ]),
  Microphone: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z", key: "mic" })
  ]),
  Search: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z", key: "search" })
  ]),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', { fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor", ...props },
      React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m4.5 12.75 6 6 9-13.5", key: "check" })
    )
  ),
  Bike: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', { fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
       React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5.5 17.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", key: "wheel_back" }), 
       React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M18.5 17.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z", key: "wheel_front" }),
       React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5.5 15h13", key: "chassis" }),
       React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.5 15l-3-6h-4l-2 3", key: "body" }),
       React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12.5 9l-1-3h3", key: "handle" })
    )
  ),
  // New Moto Icon for Selector
  Moto: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2 17.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0", key: "w1" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M17 17.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0", key: "w2" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 17.5h15", key: "line" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M14 9l-2 6-2.5-1.5", key: "frame" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9l2.5-3.5h3", key: "top" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 13.5l-2-2.5", key: "seat" })
  ]),
  Car: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0m10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0", key: "wheels" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2 12h20a1 1 0 0 1 1 1v4h-2v-1a3 3 0 0 0-6 0v1H9v-1a3 3 0 0 0-6 0v1H1v-4a1 1 0 0 1 1-1", key: "body" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 12l2-5h10l2 5", key: "top" })
  ]),
  // New Taxi Icon
  Taxi: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w1" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M7.5 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w2" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12.75h19.5", key: "bumper" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 12.75v3a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-3", key: "body" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5.25 12.75 7.5 6.75h9l2.25 6", key: "top" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 4.5h3v2.25h-3v-2.25Z", key: "sign", fill: "currentColor" })
  ]),
  // New Sedan Icon (Liffan)
  Sedan: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.25 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w1" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w2" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12.75h19.5v2.25a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-2.25Z", key: "body" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 12.75 6 7.5h12l2.25 5.25", key: "top" })
  ]),
  Truck: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", key: "wheels" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2 17V5h13v12H2m13 0h5v-5l-2-3h-3v8", key: "body" })
  ]),
  // New Pickup Icon
  Pickup: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w1" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M7.5 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w2" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12.75H12v-5.25h-3L6 10.5l-2.25 2.25h-1.5v3.75a1.5 1.5 0 0 0 1.5 1.5h.75", key: "front" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 12.75h9.75v3a1.5 1.5 0 0 1-1.5 1.5h-2.25", key: "bed" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 12.75v-3.75h9.75v3.75", key: "cargo" })
  ]),
  // New Bus Icon (Other)
  Bus: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M18 17.25a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w1" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 17.25a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z", key: "w2" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 15.75V5.25a2.25 2.25 0 0 1 2.25-2.25h12a2.25 2.25 0 0 1 2.25 2.25v10.5", key: "body" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 11.25h16.5", key: "belt" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 15.75h1.5m13.5 0h1.5m-10.5 0h6", key: "bottom" })
  ]),
  More: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z", key: "more" })
  ]),
  Phone: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z", key: "phone" })
  ]),
  WhatsApp: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', { fill: "currentColor", viewBox: "0 0 24 24", ...props },
      React.createElement('path', { d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z", key: "wa" })
    )
  ),
  Filter: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75", key: "filter" })
  ]),
  Copy: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5", key: "copy" })
  ]),
  ChevronDown: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m19.5 8.25-7.5 7.5-7.5-7.5-7.5", key: "down" })
  ]),
  ChevronUp: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m4.5 15.75 7.5-7.5 7.5 7.5", key: "up" })
  ]),
  Clock: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", key: "clock" })
  ]),
  Star: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z", key: "star" })
  ]),
  MapPin: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", key: "pin1" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z", key: "pin2" })
  ]),
  Camera: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z", key: "cam1" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z", key: "cam2" })
  ]),
  PaperClip: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13", key: "clip" })
  ]),
  Image: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z", key: "img" })
  ]),
  File: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z", key: "file" })
  ]),
  Bell: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0", key: "bell" })
  ]),
  XMark: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18 18 6M6 6l12 12", key: "x" })
  ]),
  Plus: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4.5v15m7.5-7.5h-15", key: "plus" })
  ]),
  Utensils: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 17.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z", key: "list" })
  ]),
  Clipboard: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3.25h.008v.008H6.75v-.008Zm0 3.25h.008v.008H6.75v-.008Z", key: "clip2" })
  ]),
  PlusCircle: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", key: "plusc" })
  ]),
  MinusCircle: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", key: "minusc" })
  ]),
  Trash: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0", key: "trash" })
  ]),
  Bed: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", key: "bed_fallback" }),
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.25 10.5V6a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25v4.5m16.5 0a2.25 2.25 0 0 0-2.25-2.25h-12a2.25 2.25 0 0 0-2.25 2.25m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.555 18 12 18s-8.25-1.847-8.25-4.5v-3.75m16.5 0c0 2.653-3.697 4.5-8.25 4.5s-8.25-1.847-8.25-4.5", key: "bed" })
  ]),
  Bath: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.25 19.5h7.5m-7.5-3h7.5m-7.5-3h7.5m-7.5-3h7.5m-7.5-3h7.5m-7.5-3h7.5m-7.5-3h7.5", key: "bath" })
  ]),
  Grid: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z", key: "grid" })
  ]),
  Scale: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z", key: "scale" })
  ]),
  QrCode: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z", key: "qr1" }),
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z", key: "qr2" })
  ]),
  Scan: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15", key: "scan" })
  ]),
  Shield: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z", key: "shield" })
  ]),
  ShieldCheck: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z", key: "shield-check" })
  ]),
  Globe: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418", key: "globe" })
  ]),
  User: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z", key: "user" })
  ]),
  Sparkles: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z", key: "sparkles" })
  ]),
  Broadcast: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46", key: "broadcast" })
  ]),
  Sun: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.25-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z", key: "sun" })
  ]),
  Moon: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z", key: "moon" })
  ]),
  Briefcase: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z", key: "briefcase" })
  ]),
  Calendar: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0h18M5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5", key: "cal" })
  ]),
  Repeat: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99", key: "repeat" })
  ]),
  Building: createIcon([
     React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75v.75h-.75v-.75Zm0 3h.75v.75h-.75v-.75Zm0 3h.75v.75h-.75v-.75Zm0 3h.75v.75h-.75v-.75ZM11.25 2.25v1.5m0 3v1.5m0 3v1.5m0 3v1.5m0 3v1.5m0 3v1.5m0 3v1.5M15.75 2.25v1.5m0 3v1.5m0 3v1.5m0 3v1.5m0 3v1.5", key: "building" })
  ]),
  School: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.499 5.84c-.867.294-1.761.562-2.658.813m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5", key: "school" })
  ]),
};
