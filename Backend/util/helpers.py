from bson import ObjectId
from rest_framework.response import Response
from rest_framework import status


class MongoJSONEncoder:
    """Helper to convert MongoDB ObjectId to string"""
    
    @staticmethod
    def encode(data):
        if isinstance(data, dict):
            return {key: MongoJSONEncoder.encode(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [MongoJSONEncoder.encode(item) for item in data]
        elif isinstance(data, ObjectId):
            return str(data)
        else:
            return data


def success_response(data, message='Success', status_code=status.HTTP_200_OK):
    """Standardized success response"""
    return Response({
        'success': True,
        'message': message,
        'data': data
    }, status=status_code)


def error_response(message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Standardized error response"""
    response_data = {
        'success': False,
        'message': message
    }
    
    if errors:
        response_data['errors'] = errors
    
    return Response(response_data, status=status_code)