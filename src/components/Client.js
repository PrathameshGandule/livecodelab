import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username }) => {
    let shortUsername = username.length > 10 ? username.slice(0, 8)+"..." : username;
    return (
        <div className="client">
            <Avatar name={username} size={50} round="15px" />
            <span className="userName" title={username}>{shortUsername}</span>
        </div>
    );
};

export default Client;
