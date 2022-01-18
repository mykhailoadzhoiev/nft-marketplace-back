FROM node:14

RUN apt update
RUN apt install ffmpeg -y

WORKDIR /usr/src/app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "run", "dev_hard" ]