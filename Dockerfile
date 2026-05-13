FROM swipl:latest
WORKDIR /app
COPY server/ /app/server/
COPY web/ /app/web/
WORKDIR /app/server
EXPOSE 8080
CMD ["swipl", "-s", "server.pl"]
