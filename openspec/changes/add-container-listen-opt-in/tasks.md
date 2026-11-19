## 1. Container listener opt-in

- [x] 1.1 Bind `0.0.0.0` in the packaged layout only for the exact `MEKSTATION_CONTAINER_LISTEN=all-interfaces` plus `HOSTNAME=0.0.0.0`, logging `CONTAINER_LISTEN_ALL_INTERFACES` at boot (`server.js`).
- [x] 1.2 Ignore, with a logged line, every other value and the variable with any other host; keep the loopback rule and development mode unchanged.
- [x] 1.3 Set the variable in the production `Dockerfile` only.
- [x] 1.4 Extend `scripts/__tests__/validate-multiplayer-packaged-socket.test.ts`: the exact-value matrix, the desktop shape (`127.0.0.1` with an inherited flag), every other rejected host with the flag, development mode, and a scan that keeps the variable out of everything but the Dockerfile.
- [x] 1.5 Prove the container answers `/api/health` through a loopback port map, and that a non-loopback `Host` is refused by the same-host guard. Fix the image HEALTHCHECK to `127.0.0.1` (in the image `localhost` resolves to `::1`, which the IPv4 all-interfaces listener does not serve).
- [x] 1.6 Publish the container port on `127.0.0.1` only in `docker-compose.yml` (app and dev) and `npm run docker:run`, drop the traefik labels, move the compose healthcheck to `127.0.0.1`, document that remote/LAN access is unsupported, and add a test that fails on any non-loopback publish or reverse-proxy label (C4 review F1, F2).
- [ ] 1.7 Independent security review, and C4 review (multiplayer server boot).
