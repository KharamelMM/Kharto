FROM node:14.18.1-alpine
COPY ./ ./
RUN npm install
CMD npm start