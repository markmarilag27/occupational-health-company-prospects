FROM oven/bun:1.3-slim

ARG DEBIAN_FRONTEND=noninteractive
ARG USER_ID=1000
ARG GROUP_ID=1000
ARG USERNAME=dev

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    bash \
    curl \
    ca-certificates \
    git \
    openssh-client \
    sudo \
    unzip \
    jq \
    ripgrep \
    fd-find \
    nano \
    vim-tiny \
    procps \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Force-reclaim UID/GID 1000 if they are already taken by the 'bun' user
RUN if getent passwd $USER_ID; then userdel -f $(id -un $USER_ID); fi && \
    if getent group $GROUP_ID; then groupdel $(getent group $GROUP_ID | cut -d: -f1); fi && \
    groupadd --gid $GROUP_ID $USERNAME && \
    useradd --uid $USER_ID --gid $GROUP_ID -m $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

WORKDIR /var/www/html

RUN chown $USER_ID:$GROUP_ID /var/www/html

# Set up local bun directory structure with correct ownership
RUN mkdir -p /home/$USERNAME/.bun/bin && \
    chown -R $USER_ID:$GROUP_ID /home/$USERNAME/.bun

USER $USERNAME

RUN mkdir -p /home/$USERNAME/.config \
    /home/$USERNAME/.cache \
    /home/$USERNAME/.local/bin

ENV PATH="/home/${USERNAME}/.bun/bin:/home/${USERNAME}/.local/bin:${PATH}"

CMD ["sleep", "infinity"]
