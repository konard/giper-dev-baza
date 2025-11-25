FROM node:24-alpine
COPY ${GITHUB_WORKSPACE}/giper/baza/app/run/- /giper/baza
WORKDIR /giper/baza
RUN [ "npm", "install" ]
ENTRYPOINT [ "node", "node.js", "port=9090" ]
